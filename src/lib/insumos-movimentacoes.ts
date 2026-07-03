import { prisma } from "./prisma";
import { normalizarValoresDecimalParaClient } from "./ordens-servico-financeiro";
import { 
  criarMovimentacaoEstoque, 
  OrigemMovimentacao 
} from "./movimentacao-estoque-service";
import type { RegistrarMovimentacaoManualValues } from "./insumos-movimentacoes-schema";

export class InsumoMovimentacaoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "InsumoMovimentacaoError";
    this.status = status;
  }
}

export async function listarMovimentacoesInsumo(insumoId: string) {
  const insumo = await prisma.insumo.findUnique({
    where: { id: insumoId },
  });

  if (!insumo) {
    throw new InsumoMovimentacaoError("Insumo não encontrado.", 404);
  }

  const movimentacoes = await prisma.movimentacaoEstoqueInsumo.findMany({
    where: { insumoId },
    orderBy: { criadoEm: "desc" },
    include: {
      ordemServico: {
        select: { numero: true }
      }
    }
  });

  return {
    insumo: normalizarValoresDecimalParaClient(insumo),
    movimentacoes: normalizarValoresDecimalParaClient(movimentacoes),
  };
}

export async function registrarMovimentacaoManual(
  insumoId: string,
  payload: RegistrarMovimentacaoManualValues
) {
  const insumo = await prisma.insumo.findUnique({
    where: { id: insumoId },
    select: { id: true },
  });

  if (!insumo) {
    throw new InsumoMovimentacaoError("Insumo não encontrado.", 404);
  }

  try {
    const origem = payload.tipo === "AJUSTE" 
      ? OrigemMovimentacao.AJUSTE_ESTOQUE 
      : OrigemMovimentacao.MANUAL;

    const movimentacao = await criarMovimentacaoEstoque({
      insumoId,
      tipo: payload.tipo,
      origem,
      quantidade: payload.quantidade,
      novoSaldo: payload.novoSaldo,
      custoUnitario: payload.custoUnitario,
      observacao: payload.observacao,
      motivo: payload.motivo,
    });

    return normalizarValoresDecimalParaClient(movimentacao);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Estoque") || error.message.includes("estoque")) {
        throw new InsumoMovimentacaoError(error.message, 400);
      }
      if (error.message.includes("Motivo")) {
        throw new InsumoMovimentacaoError(error.message, 400);
      }
    }
    throw error;
  }
}
