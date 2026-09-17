import { prisma } from "@/lib/prisma";
import { intervaloDoDiaOperacional } from "@/lib/date-range";
import { normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";
import type {
  AbrirCaixaValues,
  FecharCaixaValues,
  MovimentacaoCaixaValues,
} from "@/lib/caixa-schema";
import { Prisma } from "@prisma/client";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";

export class CaixaError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CaixaError";
    this.status = status;
  }
}

export async function obterCaixaAberto() {
  const caixa = await prisma.caixa.findFirst({
    where: { status: "ABERTO" },
    include: {
      movimentacoes: {
        include: {
          formaPagamento: true,
        },
        orderBy: { criadoEm: "desc" }
      }
    },
  });

  if (caixa) {
    return calcularTotaisCaixa(caixa);
  }

  return null;
}

/** Consulta leve para alertas: só identifica o caixa aberto, sem movimentações nem totais. */
export async function obterResumoCaixaAberto() {
  return prisma.caixa.findFirst({
    where: { status: "ABERTO" },
    select: { id: true, dataAbertura: true },
  });
}

export async function abrirCaixa(payload: AbrirCaixaValues) {
  const caixaAberto = await prisma.caixa.findFirst({
    where: { status: "ABERTO" },
  });

  if (caixaAberto) {
    throw new CaixaError("Já existe um caixa aberto.", 400);
  }

  const novoCaixa = await prisma.caixa.create({
    data: {
      saldoInicial: payload.saldoInicial,
      observacao: payload.observacao,
    },
  });

  return normalizarValoresDecimalParaClient(novoCaixa);
}

export async function fecharCaixa(caixaId: string, payload: FecharCaixaValues) {
  const result = await prisma.$transaction(async (tx) => {
    const caixa = await tx.caixa.findUnique({
      where: { id: caixaId },
      include: {
        movimentacoes: {
          include: { formaPagamento: true }
        }
      }
    });

    if (!caixa) {
      throw new CaixaError("Caixa não encontrado.", 404);
    }

    if (caixa.status === "FECHADO") {
      throw new CaixaError("Caixa já está fechado.", 400);
    }

    const caixaComTotais = calcularTotaisCaixa(caixa) as any;
    const divergencia = payload.saldoFinalInformado - caixaComTotais.totais.saldoFisicoCalculado;

    const caixaAtualizado = await tx.caixa.update({
      where: { id: caixaId },
      data: {
        status: "FECHADO",
        dataFechamento: new Date(),
        saldoFinalInformado: payload.saldoFinalInformado,
        saldoFinalCalculado: caixaComTotais.totais.saldoFisicoCalculado,
        divergencia: divergencia,
        observacao: payload.observacao ?? caixa.observacao,
      },
    });

    return caixaAtualizado;
  });

  return normalizarValoresDecimalParaClient(result);
}

export async function registrarMovimentacaoCaixa(
  caixaId: string,
  payload: MovimentacaoCaixaValues,
  txClient?: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  const db = txClient ?? prisma;

  const caixa = await db.caixa.findUnique({
    where: { id: caixaId },
    select: { status: true },
  });

  if (!caixa) {
    throw new CaixaError("Caixa não encontrado.", 404);
  }

  if (caixa.status === "FECHADO") {
    throw new CaixaError("Não é possível movimentar um caixa fechado.", 400);
  }

  const movimentacao = await db.movimentacaoCaixa.create({
    data: {
      caixaId,
      tipo: payload.tipo,
      origem: "MANUAL",
      valor: payload.valor,
      descricao: payload.descricao,
      formaPagamentoId: payload.formaPagamentoId,
    },
    include: {
      formaPagamento: true,
    },
  });

  return normalizarValoresDecimalParaClient(movimentacao);
}

export async function registrarMovimentacaoAutomaticaCaixa(
  payload: {
    caixaId: string;
    tipo: "ENTRADA" | "SAIDA";
    origem: "PAGAMENTO_OS";
    valor: number;
    descricao: string;
    formaPagamentoId?: string;
    pagamentoId?: string;
    ordemServicoId?: string;
  },
  txClient: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  const caixa = await txClient.caixa.findUnique({
    where: { id: payload.caixaId },
    select: { status: true },
  });

  if (!caixa) {
    throw new CaixaError("Caixa não encontrado.", 404);
  }

  if (caixa.status === "FECHADO") {
    throw new CaixaError("Não é possível movimentar um caixa fechado.", 400);
  }

  const movimentacao = await txClient.movimentacaoCaixa.create({
    data: {
      caixaId: payload.caixaId,
      tipo: payload.tipo,
      origem: payload.origem,
      valor: payload.valor,
      descricao: payload.descricao,
      formaPagamentoId: payload.formaPagamentoId,
      pagamentoId: payload.pagamentoId,
      ordemServicoId: payload.ordemServicoId,
    },
  });

  return normalizarValoresDecimalParaClient(movimentacao);
}

function montarWhereListagemCaixas(params?: { dataInicio?: string; dataFim?: string }) {
  const where: any = {};

  if (params?.dataInicio && params?.dataFim) {
    // Dias completos no fuso da operação, independente do fuso do processo.
    where.dataAbertura = {
      gte: intervaloDoDiaOperacional(params.dataInicio).inicio,
      lt: intervaloDoDiaOperacional(params.dataFim).fimExclusivo,
    };
  }

  return where;
}

export async function listarCaixas(params?: { take?: number; skip?: number; dataInicio?: string; dataFim?: string }) {
  const where = montarWhereListagemCaixas(params);

  const caixas = await prisma.caixa.findMany({
    where,
    orderBy: { dataAbertura: "desc" },
    take: params?.take,
    skip: params?.skip,
  });

  return normalizarValoresDecimalParaClient(caixas);
}

/**
 * Histórico de caixas paginado server-side. Apenas leitura: nenhum total,
 * saldo ou divergência é recalculado aqui — os valores exibidos são os
 * persistidos no fechamento de cada caixa.
 */
export async function listarCaixasPaginado(params: {
  dataInicio?: string;
  dataFim?: string;
  paginacao: PaginacaoNormalizada;
}) {
  const where = montarWhereListagemCaixas(params);

  const resultado = await paginarConsulta({
    paginacao: params.paginacao,
    contar: () => prisma.caixa.count({ where }),
    buscar: ({ skip, take }) =>
      prisma.caixa.findMany({
        where,
        orderBy: [{ dataAbertura: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
  });

  return {
    data: normalizarValoresDecimalParaClient(resultado.data),
    pagination: resultado.pagination,
  };
}

export async function obterDetalhesCaixa(id: string) {
  const caixa = await prisma.caixa.findUnique({
    where: { id },
    include: {
      movimentacoes: {
        include: {
          formaPagamento: true,
        },
        orderBy: { criadoEm: "desc" }
      },
    },
  });

  if (!caixa) {
    return null;
  }

  return calcularTotaisCaixa(caixa);
}

function calcularTotaisCaixa(caixa: any) {
  let entradasFisicas = 0;
  let saidasFisicas = 0;
  let sangrias = 0;
  let reforcos = 0;

  const totaisPorFormaPagamento: Record<string, number> = {};

  const movimentacoes = caixa.movimentacoes || [];

  for (const mov of movimentacoes) {
    const valor = Number(mov.valor) || 0;
    // Chave de agrupamento do "Total Recebido no Dia" (rótulo de exibição).
    const nomeForma = mov.formaPagamento?.nome?.toUpperCase() || "DINHEIRO";
    // Critério de dinheiro físico (gaveta): usa o campo confiável formaPagamento.tipo,
    // não o nome. Movimentação sem forma de pagamento continua sendo tratada como
    // dinheiro (comportamento preservado — ex.: sangrias/reforços e entradas avulsas).
    const ehDinheiro = !mov.formaPagamento || mov.formaPagamento.tipo === "DINHEIRO";

    if (mov.tipo === "ENTRADA") {
      totaisPorFormaPagamento[nomeForma] = (totaisPorFormaPagamento[nomeForma] || 0) + valor;
      if (ehDinheiro) {
        entradasFisicas += valor;
      }
    } else if (mov.tipo === "SAIDA") {
      totaisPorFormaPagamento[nomeForma] = (totaisPorFormaPagamento[nomeForma] || 0) - valor;
      if (ehDinheiro) {
        saidasFisicas += valor;
      }
    } else if (mov.tipo === "SANGRIA") {
      sangrias += valor;
    } else if (mov.tipo === "REFORCO") {
      reforcos += valor;
    }
  }

  const saldoInicial = Number(caixa.saldoInicial) || 0;
  const saldoFisicoCalculado = saldoInicial + entradasFisicas - saidasFisicas - sangrias + reforcos;

  const totalGeralRecebido = Object.values(totaisPorFormaPagamento).reduce((acc, val) => acc + val, 0);

  return normalizarValoresDecimalParaClient({
    ...caixa,
    totais: {
      entradasFisicas,
      saidasFisicas,
      sangrias,
      reforcos,
      saldoFisicoCalculado,
      totalGeralRecebido,
      totaisPorFormaPagamento,
    },
  });
}
