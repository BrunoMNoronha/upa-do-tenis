import { Prisma } from "@prisma/client";

import { AtendimentoRapidoError } from "@/lib/atendimento-rapido";
import { registrarMovimentacaoAutomaticaCaixa } from "@/lib/caixa";
import type { EstornarAtendimentoRapidoValues } from "@/lib/atendimento-rapido-estorno-schema";
import { normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";
import { prisma } from "@/lib/prisma";

/** Mesma origem gravada em MovimentacaoCaixa.origem. */
export const ORIGEM_CAIXA_ESTORNO_ATENDIMENTO_RAPIDO = "ESTORNO_ATENDIMENTO_RAPIDO" as const;

export const MENSAGEM_ATENDIMENTO_JA_ESTORNADO = "Este atendimento já foi estornado.";

const OPCOES_TRANSACAO = { maxWait: 5_000, timeout: 15_000 };

/**
 * Estorna um Atendimento Rápido inteiro: todos os pagamentos de uma vez, nunca
 * um só (decisão de negócio). Para cada pagamento grava o `EstornoPagamento` e
 * lança a SAÍDA no caixa aberto na forma original, tudo na mesma transação.
 * O atendimento não é apagado: fica no histórico, estornado.
 */
export async function estornarAtendimentoRapido(
  atendimentoRapidoId: string,
  payload: EstornarAtendimentoRapidoValues,
  usuarioId: string,
) {
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Trava a linha do atendimento: estornos concorrentes do mesmo AR ficam
      // em fila e o segundo já enxerga os estornos do primeiro.
      const travados = await tx.$queryRaw<{ codigo: string }[]>`
        SELECT "codigo" FROM "AtendimentoRapido" WHERE "id" = ${atendimentoRapidoId} FOR UPDATE`;

      if (travados.length === 0) {
        throw new AtendimentoRapidoError("Atendimento rápido não encontrado.", 404);
      }
      const { codigo } = travados[0];

      const pagamentos = await tx.pagamento.findMany({
        where: { atendimentoRapidoId },
        include: { estorno: { select: { id: true } } },
        orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
      });

      if (pagamentos.some((pagamento) => pagamento.estorno)) {
        throw new AtendimentoRapidoError(MENSAGEM_ATENDIMENTO_JA_ESTORNADO, 409);
      }

      if (pagamentos.length === 0) {
        throw new AtendimentoRapidoError("Este atendimento não tem pagamentos para estornar.", 409);
      }

      const caixaAberto = await tx.caixa.findFirst({ where: { status: "ABERTO" }, select: { id: true } });

      if (!caixaAberto) {
        throw new AtendimentoRapidoError("Não há caixa aberto. Abra o caixa primeiro.", 400);
      }

      const estornos = [];

      for (const pagamento of pagamentos) {
        const estorno = await tx.estornoPagamento.create({
          data: {
            pagamentoId: pagamento.id,
            valor: pagamento.valor,
            motivo: payload.motivo,
            usuarioId,
          },
        });

        await registrarMovimentacaoAutomaticaCaixa(
          {
            caixaId: caixaAberto.id,
            tipo: "SAIDA",
            origem: ORIGEM_CAIXA_ESTORNO_ATENDIMENTO_RAPIDO,
            valor: pagamento.valor.toString(),
            descricao: `Estorno do atendimento rápido ${codigo}`,
            formaPagamentoId: pagamento.formaPagamentoId,
            atendimentoRapidoId,
            estornoPagamentoId: estorno.id,
          },
          tx,
        );

        estornos.push(estorno);
      }

      return { atendimentoRapidoId, codigo, estornos };
    }, OPCOES_TRANSACAO);

    return normalizarValoresDecimalParaClient(resultado);
  } catch (error) {
    // Dois estornos simultâneos do mesmo pagamento: a restrição única decide.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AtendimentoRapidoError(MENSAGEM_ATENDIMENTO_JA_ESTORNADO, 409);
    }
    throw error;
  }
}
