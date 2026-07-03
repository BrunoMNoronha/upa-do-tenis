import { prisma } from "@/lib/prisma";
import { normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";
import type { RegistrarInsumoItemOrdemServicoValues } from "@/lib/ordens-servico-insumos-schema";
import { criarMovimentacaoEstoque, TipoMovimentacao, OrigemMovimentacao } from "@/lib/movimentacao-estoque-service";

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



  const custoTotalAplicado = payload.quantidade * payload.custoUnitarioAplicado;

  const registro = await prisma.$transaction(async (tx) => {
    const insumoTx = await tx.insumo.findUnique({
      where: { id: payload.insumoId },
      select: { quantidadeEstoque: true },
    });

    if (!insumoTx) {
      throw new Error("Insumo não encontrado.");
    }

    if (Number(insumoTx.quantidadeEstoque) < payload.quantidade) {
      throw new Error("Estoque insuficiente.");
    }

    const r = await tx.insumoItemOrdem.create({
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

    await criarMovimentacaoEstoque({
      insumoId: payload.insumoId,
      tipo: TipoMovimentacao.BAIXA_OS,
      origem: OrigemMovimentacao.ORDEM_SERVICO,
      quantidade: payload.quantidade,
      ordemServicoId,
      itemOrdemServicoId: payload.itemOrdemServicoId,
      observacao: payload.observacoes,
    }, tx);

    return r;
  }).catch((e) => {
    if (e.message && (e.message.includes("Estoque") || e.message.includes("estoque"))) {
      throw new InsumoItemOrdemServicoError(e.message, 400);
    }
    if (e.message && e.message.includes("Insumo não encontrado")) {
      throw new InsumoItemOrdemServicoError(e.message, 404);
    }
    throw e;
  });

  return normalizarValoresDecimalParaClient({
    insumoAplicado: registro,
    ordemServico: ordem,
  });
}

export async function removerInsumoItemOrdemServico(
  ordemServicoId: string,
  insumoItemOrdemId: string,
) {
  const ordem = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    select: { id: true },
  });

  if (!ordem) {
    throw new InsumoItemOrdemServicoError("Ordem de serviço não encontrada.", 404);
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const registro = await tx.insumoItemOrdem.findFirst({
      where: {
        id: insumoItemOrdemId,
        itemOrdemServico: { ordemServicoId },
      },
    });

    if (!registro) {
      throw new InsumoItemOrdemServicoError("Insumo da ordem de serviço não encontrado.", 404);
    }

    await tx.insumoItemOrdem.delete({
      where: { id: insumoItemOrdemId },
    });

    await criarMovimentacaoEstoque({
      insumoId: registro.insumoId,
      tipo: TipoMovimentacao.ESTORNO_OS,
      origem: OrigemMovimentacao.ORDEM_SERVICO,
      quantidade: Number(registro.quantidade),
      ordemServicoId,
      itemOrdemServicoId: registro.itemOrdemServicoId,
    }, tx);

    return registro;
  });

  return normalizarValoresDecimalParaClient(resultado);
}

export async function atualizarInsumoItemOrdemServico(
  ordemServicoId: string,
  insumoItemOrdemId: string,
  payload: { quantidade: number }
) {
  if (payload.quantidade <= 0) {
    throw new InsumoItemOrdemServicoError("A quantidade deve ser maior que zero.", 400);
  }

  const ordem = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    select: { id: true },
  });

  if (!ordem) {
    throw new InsumoItemOrdemServicoError("Ordem de serviço não encontrada.", 404);
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const registroAtual = await tx.insumoItemOrdem.findFirst({
      where: {
        id: insumoItemOrdemId,
        itemOrdemServico: { ordemServicoId },
      },
    });

    if (!registroAtual) {
      throw new InsumoItemOrdemServicoError("Insumo da ordem de serviço não encontrado.", 404);
    }

    const quantidadeAnterior = Number(registroAtual.quantidade);
    const quantidadeNova = payload.quantidade;
    const diferenca = Math.abs(quantidadeNova - quantidadeAnterior);

    if (quantidadeNova > quantidadeAnterior) {
      await criarMovimentacaoEstoque({
        insumoId: registroAtual.insumoId,
        tipo: TipoMovimentacao.BAIXA_OS,
        origem: OrigemMovimentacao.ORDEM_SERVICO,
        quantidade: diferenca,
        ordemServicoId,
        itemOrdemServicoId: registroAtual.itemOrdemServicoId,
      }, tx);
    } else if (quantidadeNova < quantidadeAnterior) {
      await criarMovimentacaoEstoque({
        insumoId: registroAtual.insumoId,
        tipo: TipoMovimentacao.ESTORNO_OS,
        origem: OrigemMovimentacao.ORDEM_SERVICO,
        quantidade: diferenca,
        ordemServicoId,
        itemOrdemServicoId: registroAtual.itemOrdemServicoId,
      }, tx);
    }

    const novoCustoTotal = quantidadeNova * Number(registroAtual.custoUnitarioAplicado);

    const registroAtualizado = await tx.insumoItemOrdem.update({
      where: { id: insumoItemOrdemId },
      data: {
        quantidade: quantidadeNova,
        custoTotalAplicado: novoCustoTotal,
      },
      include: {
        insumo: true,
        itemOrdemServico: { select: { id: true, descricao: true } },
      },
    });

    return registroAtualizado;
  }).catch((e) => {
    if (e.message && e.message.includes("Estoque") || e.message.includes("estoque")) {
      throw new InsumoItemOrdemServicoError(e.message, 400);
    }
    throw e;
  });

  return normalizarValoresDecimalParaClient(resultado);
}