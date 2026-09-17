import { travarCaixa } from "@/lib/caixa";
import { devolverEstoqueProdutoVenda } from "@/lib/movimentacao-estoque-produto-service";
import { normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";
import { prisma } from "@/lib/prisma";
import type { CancelarVendaBalcaoValues } from "@/lib/vendas-cancelamento-schema";
import { VendaBalcaoError } from "@/lib/vendas";

/** Mesma origem gravada em MovimentacaoCaixa.origem. */
export const ORIGEM_CAIXA_CANCELAMENTO_VENDA_BALCAO = "CANCELAMENTO_VENDA_BALCAO" as const;

export const MENSAGEM_VENDA_JA_CANCELADA = "Esta venda já foi cancelada.";

const OPCOES_TRANSACAO = { maxWait: 5_000, timeout: 15_000 };

/**
 * Cancela uma venda de balcão inteira (decisão de negócio: nunca parcial), em
 * uma transação: marca a venda como CANCELADA com data, motivo e usuário,
 * devolve cada item ao estoque (ESTORNO_VENDA) e lança a SAÍDA do valor total
 * no caixa aberto, na forma de pagamento da venda. A venda fica no histórico.
 *
 * Ordem das travas: venda → caixa → produtos. O registro de venda trava
 * caixa → produtos e nunca uma venda existente, então não há ciclo.
 */
export async function cancelarVendaBalcao(vendaId: string, payload: CancelarVendaBalcaoValues, usuarioId: string) {
  const resultado = await prisma.$transaction(async (tx) => {
    // Trava a venda: cancelamentos concorrentes da mesma venda ficam em fila
    // e o segundo já a encontra CANCELADA.
    const travadas = await tx.$queryRaw<{ status: string }[]>`
      SELECT "status" FROM "Venda" WHERE "id" = ${vendaId} FOR UPDATE`;

    if (travadas.length === 0) {
      throw new VendaBalcaoError("Venda não encontrada.", 404);
    }

    if (travadas[0].status === "CANCELADA") {
      throw new VendaBalcaoError(MENSAGEM_VENDA_JA_CANCELADA, 409);
    }

    const caixaAberto = await tx.caixa.findFirst({ where: { status: "ABERTO" }, select: { id: true } });

    if (!caixaAberto || (await travarCaixa(tx, caixaAberto.id)) === "FECHADO") {
      throw new VendaBalcaoError("Não há caixa aberto. Abra o caixa primeiro.", 400);
    }

    const venda = await tx.venda.findUniqueOrThrow({ where: { id: vendaId }, include: { itens: true } });

    for (const item of venda.itens) {
      await devolverEstoqueProdutoVenda(
        {
          produtoId: item.produtoId,
          quantidade: Number(item.quantidade),
          vendaId,
          itemVendaId: item.id,
          motivo: payload.motivo,
        },
        tx,
      );
    }

    await tx.movimentacaoCaixa.create({
      data: {
        caixaId: caixaAberto.id,
        tipo: "SAIDA",
        origem: ORIGEM_CAIXA_CANCELAMENTO_VENDA_BALCAO,
        valor: venda.valorTotal,
        descricao: `Cancelamento da venda de balcão ${venda.numero}`,
        formaPagamentoId: venda.formaPagamentoId,
        vendaId,
      },
    });

    return tx.venda.update({
      where: { id: vendaId },
      data: {
        status: "CANCELADA",
        dataCancelamento: new Date(),
        motivoCancelamento: payload.motivo,
        canceladoPorId: usuarioId,
      },
      include: { canceladoPor: { select: { id: true, nome: true } } },
    });
  }, OPCOES_TRANSACAO);

  return normalizarValoresDecimalParaClient(resultado);
}
