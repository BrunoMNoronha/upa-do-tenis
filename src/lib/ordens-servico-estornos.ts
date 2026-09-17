import { Prisma } from "@prisma/client";

import { registrarMovimentacaoAutomaticaCaixa } from "@/lib/caixa";
import {
  INCLUDE_ESTORNO_PAGAMENTO,
  calcularResumoFinanceiroOS,
  normalizarValoresDecimalParaClient,
} from "@/lib/ordens-servico-financeiro";
import { PagamentoOrdemServicoError } from "@/lib/ordens-servico-pagamentos";
import type { EstornarPagamentoOrdemServicoValues } from "@/lib/ordens-servico-estornos-schema";
import { prisma } from "@/lib/prisma";

export const MENSAGEM_ESTORNO_OS_CANCELADA =
  "Não é possível estornar pagamento de uma OS cancelada.";
export const MENSAGEM_PAGAMENTO_JA_ESTORNADO = "Este pagamento já foi estornado.";

/**
 * Estorna um pagamento inteiro de OS (#230, fatia 2): grava o estorno, lança a
 * SAÍDA no caixa aberto na forma do pagamento original e recalcula
 * valorPago/saldo, tudo na mesma transação. Pagamentos de Atendimento Rápido
 * não têm OS e caem no 404 (fora de escopo).
 */
export async function estornarPagamentoOrdemServico(
  ordemServicoId: string,
  pagamentoId: string,
  payload: EstornarPagamentoOrdemServicoValues,
  usuarioId: string,
) {
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.findUnique({
        where: { id: pagamentoId },
        include: { estorno: { select: { id: true } } },
      });

      if (!pagamento || pagamento.ordemServicoId !== ordemServicoId) {
        throw new PagamentoOrdemServicoError("Pagamento não encontrado nesta ordem de serviço.", 404);
      }

      // Trava a linha da OS (e confirma que não está cancelada) antes de ler os
      // pagamentos: estornos concorrentes da mesma OS ficam em fila e o
      // recálculo de valorPago/saldo não perde o estorno do outro.
      const trava = await tx.ordemServico.updateMany({
        where: { id: ordemServicoId, status: { not: "CANCELADA" } },
        data: { atualizadoEm: new Date() },
      });

      if (trava.count === 0) {
        throw new PagamentoOrdemServicoError(MENSAGEM_ESTORNO_OS_CANCELADA, 409);
      }

      if (pagamento.estorno) {
        throw new PagamentoOrdemServicoError(MENSAGEM_PAGAMENTO_JA_ESTORNADO, 409);
      }

      const caixaAberto = await tx.caixa.findFirst({ where: { status: "ABERTO" } });

      if (!caixaAberto) {
        throw new PagamentoOrdemServicoError("Não há caixa aberto. Abra o caixa primeiro.", 400);
      }

      const ordem = await tx.ordemServico.findUniqueOrThrow({
        where: { id: ordemServicoId },
        include: {
          pagamentos: { include: INCLUDE_ESTORNO_PAGAMENTO },
          itens: { include: { servicos: { include: { servico: true } } } },
        },
      });

      const estorno = await tx.estornoPagamento.create({
        data: {
          pagamentoId,
          valor: pagamento.valor,
          motivo: payload.motivo,
          usuarioId,
        },
      });

      await registrarMovimentacaoAutomaticaCaixa(
        {
          caixaId: caixaAberto.id,
          tipo: "SAIDA",
          origem: "ESTORNO_PAGAMENTO_OS",
          valor: pagamento.valor.toString(),
          descricao: `Estorno de pagamento OS #${ordem.numero}`,
          formaPagamentoId: pagamento.formaPagamentoId,
          ordemServicoId,
          estornoPagamentoId: estorno.id,
        },
        tx,
      );

      const resumoFinanceiro = calcularResumoFinanceiroOS({
        statusOperacional: ordem.status,
        valorTotal: ordem.valorTotal,
        valorDesconto: ordem.valorDesconto,
        valorSinal: ordem.valorSinal,
        valorPago: ordem.valorPago,
        pagamentos: ordem.pagamentos.map((item) =>
          item.id === pagamentoId ? { ...item, estorno: { id: estorno.id } } : item,
        ),
        itens: ordem.itens,
      });

      const gravacao = await tx.ordemServico.updateMany({
        where: { id: ordemServicoId, status: { not: "CANCELADA" } },
        data: { valorPago: resumoFinanceiro.valorPago, saldo: resumoFinanceiro.saldo },
      });

      if (gravacao.count === 0) {
        throw new PagamentoOrdemServicoError(MENSAGEM_ESTORNO_OS_CANCELADA, 409);
      }

      return { estorno, resumoFinanceiro };
    });

    return normalizarValoresDecimalParaClient(resultado);
  } catch (error) {
    // Dois estornos simultâneos do mesmo pagamento: a restrição única decide.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PagamentoOrdemServicoError(MENSAGEM_PAGAMENTO_JA_ESTORNADO, 409);
    }
    throw error;
  }
}
