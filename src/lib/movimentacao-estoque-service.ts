import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export enum TipoMovimentacao {
  ENTRADA_MANUAL = "ENTRADA_MANUAL",
  SAIDA_MANUAL = "SAIDA_MANUAL",
  AJUSTE = "AJUSTE",
  BAIXA_OS = "BAIXA_OS",
  ESTORNO_OS = "ESTORNO_OS",
}

export enum OrigemMovimentacao {
  MANUAL = "MANUAL",
  ORDEM_SERVICO = "ORDEM_SERVICO",
  AJUSTE_ESTOQUE = "AJUSTE_ESTOQUE",
}

export interface CriarMovimentacaoParams {
  insumoId: string;
  tipo: TipoMovimentacao;
  origem: OrigemMovimentacao;
  quantidade?: number; // Para ENTRADA_MANUAL, SAIDA_MANUAL, BAIXA_OS, ESTORNO_OS
  novoSaldo?: number;  // Para AJUSTE
  custoUnitario?: number;
  ordemServicoId?: string;
  itemOrdemServicoId?: string;
  observacao?: string;
  motivo?: string;
}

export async function criarMovimentacaoEstoque(
  params: CriarMovimentacaoParams,
  tx: Prisma.TransactionClient = prisma
) {
  const operacao = async (t: Prisma.TransactionClient) => {
    const insumo = await t.insumo.findUnique({
      where: { id: params.insumoId },
    });

    if (!insumo) {
      throw new Error("Insumo não encontrado");
    }

    if (params.tipo === TipoMovimentacao.AJUSTE && !params.motivo) {
      throw new Error("Motivo é obrigatório para movimentações de ajuste");
    }

    const saldoAnterior = Number(insumo.quantidadeEstoque);
    let saldoPosterior = 0;
    let quantidadeDelta = 0;

    if (params.tipo === TipoMovimentacao.AJUSTE) {
      if (params.novoSaldo === undefined) {
        throw new Error("novoSaldo é obrigatório para tipo AJUSTE");
      }
      saldoPosterior = params.novoSaldo;
      quantidadeDelta = saldoPosterior - saldoAnterior;
    } else {
      if (params.quantidade === undefined || params.quantidade <= 0) {
        throw new Error("Quantidade inválida para movimentação");
      }
      if (
        params.tipo === TipoMovimentacao.ENTRADA_MANUAL ||
        params.tipo === TipoMovimentacao.ESTORNO_OS
      ) {
        quantidadeDelta = params.quantidade;
        saldoPosterior = saldoAnterior + quantidadeDelta;
      } else if (
        params.tipo === TipoMovimentacao.SAIDA_MANUAL ||
        params.tipo === TipoMovimentacao.BAIXA_OS
      ) {
        quantidadeDelta = -params.quantidade;
        saldoPosterior = saldoAnterior + quantidadeDelta;
      } else {
        throw new Error("Tipo de movimentação inválido");
      }
    }

    if (saldoPosterior < 0) {
      throw new Error("Movimentação resultaria em estoque negativo");
    }

    const custoUnit = params.custoUnitario ?? Number(insumo.custoUnitario);
    const quantidadeAbsoluta = Math.abs(quantidadeDelta);
    const custoTotal = quantidadeAbsoluta * custoUnit;

    const movimentacao = await t.movimentacaoEstoqueInsumo.create({
      data: {
        insumoId: params.insumoId,
        tipo: params.tipo,
        quantidade: quantidadeAbsoluta,
        custoUnitario: custoUnit,
        custoTotal: custoTotal,
        saldoAnterior: saldoAnterior,
        saldoPosterior: saldoPosterior,
        origem: params.origem,
        ordemServicoId: params.ordemServicoId,
        itemOrdemServicoId: params.itemOrdemServicoId,
        observacao: params.observacao,
        motivo: params.motivo,
      },
    });

    await t.insumo.update({
      where: { id: params.insumoId },
      data: {
        quantidadeEstoque: saldoPosterior,
      },
    });

    return movimentacao;
  };

  if (tx === prisma) {
    return await prisma.$transaction(operacao);
  } else {
    return await operacao(tx);
  }
}
