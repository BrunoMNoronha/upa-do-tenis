import { prisma } from "@/lib/prisma";
import { normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";
import {
  baixarEstoqueProdutoVenda,
  MovimentacaoEstoqueProdutoError,
} from "@/lib/movimentacao-estoque-produto-service";
import type { RegistrarVendaBalcaoValues } from "@/lib/vendas-schema";

export class VendaBalcaoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VendaBalcaoError";
    this.status = status;
  }
}

function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function gerarNumeroVenda(sequenciaDoDia: number): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aaaa = now.getFullYear();
  const sufixo = String(sequenciaDoDia).padStart(4, "0");
  return `VD-${dd}${mm}${aaaa}-${sufixo}`;
}

/**
 * Registra uma venda de balcão de produtos como uma única transação atômica.
 *
 * Toda a lógica financeira e de estoque roda no backend:
 * - preço unitário é lido de Produto.precoVenda (nunca do payload);
 * - preço total por item e total da venda são calculados aqui;
 * - a baixa de estoque é atômica e bloqueia estoque negativo;
 * - a entrada de caixa é criada com origem "VENDA_BALCAO" e vinculada à venda.
 *
 * Qualquer falha (caixa fechado, produto inativo, estoque insuficiente) reverte
 * tudo: nenhuma venda parcialmente persistida. Não cria registro em Pagamento
 * nem toca o financeiro de Ordem de Serviço.
 */
export async function registrarVendaBalcao(payload: RegistrarVendaBalcaoValues) {
  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Caixa aberto é pré-requisito. Validado dentro da transação para que
    //    não feche entre a checagem e a criação da movimentação.
    const caixaAberto = await tx.caixa.findFirst({
      where: { status: "ABERTO" },
      select: { id: true },
    });

    if (!caixaAberto) {
      throw new VendaBalcaoError("Não há caixa aberto. Abra o caixa primeiro.", 400);
    }

    // 2. Forma de pagamento precisa existir.
    const formaPagamento = await tx.formaPagamento.findUnique({
      where: { id: payload.formaPagamentoId },
      select: { id: true },
    });

    if (!formaPagamento) {
      throw new VendaBalcaoError("Forma de pagamento inválida.", 400);
    }

    // 3. Cliente é opcional; se informado, precisa existir.
    if (payload.clienteId) {
      const cliente = await tx.cliente.findUnique({
        where: { id: payload.clienteId },
        select: { id: true },
      });

      if (!cliente) {
        throw new VendaBalcaoError("Cliente informado não encontrado.", 400);
      }
    }

    // 4. Carregar todos os produtos do payload de uma vez.
    const produtoIds = payload.itens.map((item) => item.produtoId);
    const produtos = await tx.produto.findMany({
      where: { id: { in: produtoIds } },
      select: { id: true, nome: true, precoVenda: true, ativo: true },
    });
    const produtoPorId = new Map(produtos.map((p) => [p.id, p]));

    // 5. Montar as linhas da venda com preço vindo do backend.
    const linhas = payload.itens.map((item) => {
      const produto = produtoPorId.get(item.produtoId);

      if (!produto) {
        throw new VendaBalcaoError(
          `Produto ${item.produtoId} não encontrado.`,
          400,
        );
      }

      if (!produto.ativo) {
        throw new VendaBalcaoError(
          `O produto "${produto.nome}" está inativo e não pode ser vendido.`,
          400,
        );
      }

      const precoUnitario = arredondarMoeda(Number(produto.precoVenda));
      const precoTotal = arredondarMoeda(precoUnitario * item.quantidade);

      return {
        produtoId: produto.id,
        descricao: produto.nome,
        quantidade: item.quantidade,
        precoUnitario,
        precoTotal,
      };
    });

    const valorTotal = arredondarMoeda(
      linhas.reduce((acc, linha) => acc + linha.precoTotal, 0),
    );

    // 6. Numeração diária sequencial. O índice único em Venda.numero é a
    //    garantia final: uma colisão rara sob concorrência aborta a venda
    //    inteira (rollback), nunca persiste parcial.
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const vendasHoje = await tx.venda.count({
      where: { criadoEm: { gte: inicioDia } },
    });
    const numero = gerarNumeroVenda(vendasHoje + 1);

    // 7. Criar a venda (cabeçalho).
    const venda = await tx.venda.create({
      data: {
        numero,
        clienteId: payload.clienteId ?? null,
        status: "CONCLUIDA",
        valorTotal,
        valorDesconto: 0,
        formaPagamentoId: payload.formaPagamentoId,
        observacoes: payload.observacoes,
      },
    });

    // 8. Criar cada item e baixar o estoque do produto correspondente.
    for (const linha of linhas) {
      const itemVenda = await tx.itemVenda.create({
        data: {
          vendaId: venda.id,
          produtoId: linha.produtoId,
          descricao: linha.descricao,
          quantidade: linha.quantidade,
          precoUnitario: linha.precoUnitario,
          precoTotal: linha.precoTotal,
        },
      });

      try {
        await baixarEstoqueProdutoVenda(
          {
            produtoId: linha.produtoId,
            quantidade: linha.quantidade,
            vendaId: venda.id,
            itemVendaId: itemVenda.id,
          },
          tx,
        );
      } catch (error) {
        // O serviço de venda é o contrato de erro único para a camada de API.
        // Traduz a falha de estoque preservando status e mensagem.
        if (error instanceof MovimentacaoEstoqueProdutoError) {
          throw new VendaBalcaoError(error.message, error.status);
        }
        throw error;
      }
    }

    // 9. Entrada de caixa da venda, com origem própria e vínculo à venda.
    //    Criada diretamente na transação para não tocar o serviço de caixa
    //    compartilhado com o fluxo homologado de pagamento de OS.
    await tx.movimentacaoCaixa.create({
      data: {
        caixaId: caixaAberto.id,
        tipo: "ENTRADA",
        origem: "VENDA_BALCAO",
        valor: valorTotal,
        descricao: `Venda de balcão ${numero}`,
        formaPagamentoId: payload.formaPagamentoId,
        vendaId: venda.id,
      },
    });

    // 10. Retornar a venda completa.
    const vendaCompleta = await tx.venda.findUnique({
      where: { id: venda.id },
      include: {
        itens: true,
        formaPagamento: true,
        cliente: true,
      },
    });

    return vendaCompleta;
  });

  return normalizarValoresDecimalParaClient(resultado);
}
