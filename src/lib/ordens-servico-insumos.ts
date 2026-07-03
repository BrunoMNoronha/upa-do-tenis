import { prisma } from "@/lib/prisma";
import { normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";
import type { RegistrarInsumoItemOrdemServicoValues } from "@/lib/ordens-servico-insumos-schema";

export class InsumoItemOrdemServicoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "InsumoItemOrdemServicoError";
    this.status = status;
  }
}

export async function listarInsumosOrdemServico(ordemServicoId: string) {
  const ordem = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    select: { id: true },
  });

  if (!ordem) {
    throw new InsumoItemOrdemServicoError("Ordem de serviço não encontrada.", 404);
  }

  const insumos = await prisma.insumoItemOrdem.findMany({
    where: {
      itemOrdemServico: {
        ordemServicoId,
      },
    },
    include: {
      insumo: true,
      itemOrdemServico: {
        select: {
          id: true,
          descricao: true,
        },
      },
    },
    orderBy: [{ criadoEm: "desc" }],
  });

  return normalizarValoresDecimalParaClient(insumos);
}

export async function registrarInsumoItemOrdemServico(
  ordemServicoId: string,
  payload: RegistrarInsumoItemOrdemServicoValues,
) {
  if (payload.quantidade <= 0) {
    throw new InsumoItemOrdemServicoError("A quantidade deve ser maior que zero.", 400);
  }

  if (payload.custoUnitarioAplicado < 0) {
    throw new InsumoItemOrdemServicoError(
      "O custo unitário aplicado deve ser maior ou igual a zero.",
      400,
    );
  }

  const ordem = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    select: {
      id: true,
      valorTotal: true,
      valorPago: true,
      saldo: true,
    },
  });

  if (!ordem) {
    throw new InsumoItemOrdemServicoError("Ordem de serviço não encontrada.", 404);
  }

  const item = await prisma.itemOrdemServico.findFirst({
    where: {
      id: payload.itemOrdemServicoId,
      ordemServicoId,
    },
    select: { id: true },
  });

  if (!item) {
    throw new InsumoItemOrdemServicoError("Item da ordem de serviço não encontrado.", 404);
  }

  const insumo = await prisma.insumo.findUnique({
    where: { id: payload.insumoId },
    select: { id: true },
  });

  if (!insumo) {
    throw new InsumoItemOrdemServicoError("Insumo não encontrado.", 404);
  }

  const custoTotalAplicado = payload.quantidade * payload.custoUnitarioAplicado;

  const registro = await prisma.insumoItemOrdem.create({
    data: {
      itemOrdemServicoId: payload.itemOrdemServicoId,
      insumoId: payload.insumoId,
      quantidade: payload.quantidade,
      custoUnitarioAplicado: payload.custoUnitarioAplicado,
      custoTotalAplicado,
      observacoes: payload.observacoes,
    },
    include: {
      insumo: true,
      itemOrdemServico: {
        select: {
          id: true,
          descricao: true,
        },
      },
    },
  });

  return normalizarValoresDecimalParaClient({
    insumoAplicado: registro,
    ordemServico: ordem,
  });
}