import { prisma } from "@/lib/prisma";
import {
  INCLUDE_ESTORNO_PAGAMENTO,
  calcularResumoFinanceiroOS,
  normalizarValoresDecimalParaClient,
} from "@/lib/ordens-servico-financeiro";
import { registrarMovimentacaoAutomaticaCaixa } from "@/lib/caixa";
import { MENSAGEM_PAGAMENTO_OS_CANCELADA } from "@/lib/ordens-servico-status";
import type { RegistrarPagamentoOrdemServicoValues } from "@/lib/ordens-servico-pagamentos-schema";

export class PagamentoOrdemServicoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PagamentoOrdemServicoError";
    this.status = status;
  }
}

export async function listarPagamentosOrdemServico(ordemServicoId: string) {
  const ordem = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    select: { id: true },
  });

  if (!ordem) {
    throw new PagamentoOrdemServicoError("Ordem de serviço não encontrada.", 404);
  }

  const pagamentos = await prisma.pagamento.findMany({
    where: { ordemServicoId },
    include: {
      formaPagamento: true,
      estorno: {
        select: {
          id: true,
          valor: true,
          motivo: true,
          dataEstorno: true,
          usuario: { select: { id: true, nome: true } },
        },
      },
    },
    orderBy: [{ dataPagamento: "desc" }, { criadoEm: "desc" }],
  });

  return normalizarValoresDecimalParaClient(pagamentos);
}

export async function registrarPagamentoOrdemServico(
  ordemServicoId: string,
  payload: RegistrarPagamentoOrdemServicoValues,
) {
  const result = await prisma.$transaction(async (tx) => {
    const ordem = await tx.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: {
        pagamentos: { include: INCLUDE_ESTORNO_PAGAMENTO },
        itens: {
          include: {
            servicos: {
              include: {
                servico: true,
              },
            },
          },
        },
      },
    });

    if (!ordem) {
      throw new PagamentoOrdemServicoError("Ordem de serviço não encontrada.", 404);
    }

    if (ordem.status === "CANCELADA") {
      throw new PagamentoOrdemServicoError(MENSAGEM_PAGAMENTO_OS_CANCELADA, 409);
    }

    const caixaAberto = await tx.caixa.findFirst({
      where: { status: "ABERTO" },
    });

    if (!caixaAberto) {
      throw new PagamentoOrdemServicoError("Não há caixa aberto. Abra o caixa primeiro.", 400);
    }

    const formaPagamento = await tx.formaPagamento.findUnique({
      where: { id: payload.formaPagamentoId },
      select: { id: true },
    });

    if (!formaPagamento) {
      throw new PagamentoOrdemServicoError("Forma de pagamento inválida.", 400);
    }

    const resumoAtual = calcularResumoFinanceiroOS({
      statusOperacional: ordem.status,
      valorTotal: ordem.valorTotal,
      valorDesconto: ordem.valorDesconto,
      valorSinal: ordem.valorSinal,
      valorPago: ordem.valorPago,
      pagamentos: ordem.pagamentos,
      itens: ordem.itens,
    });

    if (payload.valor > resumoAtual.saldo) {
      throw new PagamentoOrdemServicoError(
        "Pagamento acima do saldo pendente não é permitido.",
        400,
      );
    }

    const pagamento = await tx.pagamento.create({
      data: {
        ordemServicoId,
        formaPagamentoId: payload.formaPagamentoId,
        tipo: payload.tipo ?? "PAGAMENTO",
        valor: payload.valor,
        dataPagamento: payload.dataPagamento,
        observacoes: payload.observacoes,
      },
      include: {
        formaPagamento: true,
      },
    });

    await registrarMovimentacaoAutomaticaCaixa({
      caixaId: caixaAberto.id,
      tipo: "ENTRADA",
      origem: "PAGAMENTO_OS",
      valor: payload.valor,
      descricao: `Recebimento OS #${ordem.numero}`,
      formaPagamentoId: payload.formaPagamentoId,
      pagamentoId: pagamento.id,
      ordemServicoId: ordem.id,
    }, tx);

    const ordemComPagamento = await tx.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: {
        pagamentos: { include: INCLUDE_ESTORNO_PAGAMENTO },
        itens: {
          include: {
            servicos: {
              include: {
                servico: true,
              },
            },
          },
        },
      },
    });

    if (!ordemComPagamento) {
      throw new PagamentoOrdemServicoError("Ordem de serviço não encontrada.", 404);
    }

    const resumoAtualizado = calcularResumoFinanceiroOS({
      statusOperacional: ordemComPagamento.status,
      valorTotal: ordemComPagamento.valorTotal,
      valorDesconto: ordemComPagamento.valorDesconto,
      valorSinal: ordemComPagamento.valorSinal,
      valorPago: ordemComPagamento.valorPago,
      pagamentos: ordemComPagamento.pagamentos,
      itens: ordemComPagamento.itens,
    });

    // Gravação condicionada a OS não cancelada: se um cancelamento concorrente
    // for confirmado antes, nenhuma linha é afetada e a transação inteira
    // (pagamento e movimentação de caixa) é desfeita (#229).
    const gravacao = await tx.ordemServico.updateMany({
      where: { id: ordemServicoId, status: { not: "CANCELADA" } },
      data: {
        valorPago: resumoAtualizado.valorPago,
        saldo: resumoAtualizado.saldo,
      },
    });

    if (gravacao.count === 0) {
      throw new PagamentoOrdemServicoError(MENSAGEM_PAGAMENTO_OS_CANCELADA, 409);
    }

    const ordemAtualizada = await tx.ordemServico.findUnique({
      where: { id: ordemServicoId },
    });

    return {
      pagamento,
      ordemServico: ordemAtualizada,
      resumoFinanceiro: resumoAtualizado,
    };
  });

  return normalizarValoresDecimalParaClient(result);
}