import { Prisma } from "@prisma/client";

export type StatusFinanceiro = "PENDENTE" | "PARCIAL" | "PAGO" | "CANCELADO";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

type PagamentoFinanceiroInput = {
  valor?: DecimalLike;
} | null;

type ServicoItemOrdemFinanceiroInput = {
  valor?: DecimalLike;
  servico?: {
    precoBase?: DecimalLike;
  } | null;
} | null;

type ItemOrdemServicoFinanceiroInput = {
  valor?: DecimalLike;
  servicos?: ServicoItemOrdemFinanceiroInput[] | null;
} | null;

export type OrdemServicoFinanceiroInput = {
  statusOperacional?: string | null;
  valorTotal?: DecimalLike;
  valorDesconto?: DecimalLike;
  valorSinal?: DecimalLike;
  valorPago?: DecimalLike;
  pagamentos?: PagamentoFinanceiroInput[] | null;
  itens?: ItemOrdemServicoFinanceiroInput[] | null;
};

function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function normalizarDecimalParaNumero(valor: DecimalLike, fallback = 0): number {
  if (valor === null || valor === undefined) {
    return fallback;
  }

  if (Prisma.Decimal.isDecimal(valor)) {
    return arredondarMoeda(valor.toNumber());
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? arredondarMoeda(valor) : fallback;
  }

  if (typeof valor === "string") {
    const parsed = Number(valor.replace(",", "."));
    return Number.isFinite(parsed) ? arredondarMoeda(parsed) : fallback;
  }

  return fallback;
}

function somarPagamentos(pagamentos: PagamentoFinanceiroInput[] | null | undefined): number {
  if (!pagamentos || pagamentos.length === 0) {
    return 0;
  }

  const total = pagamentos.reduce((acc, pagamento) => {
    return acc + normalizarDecimalParaNumero(pagamento?.valor, 0);
  }, 0);

  return arredondarMoeda(total);
}

function somarValorServicos(item: ItemOrdemServicoFinanceiroInput): number {
  if (!item?.servicos || item.servicos.length === 0) {
    return 0;
  }

  const totalServicos = item.servicos.reduce((acc, servicoItem) => {
    const valorServicoItem = normalizarDecimalParaNumero(servicoItem?.valor, 0);
    const precoBaseServico = normalizarDecimalParaNumero(servicoItem?.servico?.precoBase, 0);

    return acc + (valorServicoItem > 0 ? valorServicoItem : precoBaseServico);
  }, 0);

  return arredondarMoeda(totalServicos);
}

function somarItens(itens: ItemOrdemServicoFinanceiroInput[] | null | undefined): number {
  if (!itens || itens.length === 0) {
    return 0;
  }

  const totalItens = itens.reduce((acc, item) => {
    return acc + normalizarDecimalParaNumero(item?.valor, 0);
  }, 0);

  return arredondarMoeda(totalItens);
}

function somarServicosDosItens(itens: ItemOrdemServicoFinanceiroInput[] | null | undefined): number {
  if (!itens || itens.length === 0) {
    return 0;
  }

  const totalServicos = itens.reduce((acc, item) => {
    return acc + somarValorServicos(item);
  }, 0);

  return arredondarMoeda(totalServicos);
}

export function calcularValorTotalOS(ordem: OrdemServicoFinanceiroInput): number {
  const valorTotalPersistido = normalizarDecimalParaNumero(ordem.valorTotal, 0);

  if (valorTotalPersistido > 0) {
    return valorTotalPersistido;
  }

  // Compatibilidade com OS antigas sem valorTotal consistente.
  const totalServicos = somarServicosDosItens(ordem.itens);
  if (totalServicos > 0) {
    return totalServicos;
  }

  const totalItens = somarItens(ordem.itens);
  if (totalItens > 0) {
    return totalItens;
  }

  return 0;
}

export function calcularValorPago(ordem: OrdemServicoFinanceiroInput): number {
  const valorPagoLegado = normalizarDecimalParaNumero(ordem.valorPago, 0);
  const valorSinal = normalizarDecimalParaNumero(ordem.valorSinal, 0);
  const valorPagamentos = somarPagamentos(ordem.pagamentos);

  return arredondarMoeda(Math.max(valorPagoLegado, valorPagamentos + valorSinal, valorPagamentos, valorSinal, 0));
}

export function calcularSaldo(valorTotal: number, valorPago: number): number {
  return arredondarMoeda(Math.max(valorTotal - valorPago, 0));
}

export function calcularStatusFinanceiroDerivado(params: {
  statusOperacional?: string | null;
  valorTotal: number;
  valorPago: number;
}): StatusFinanceiro {
  const status = (params.statusOperacional ?? "").toUpperCase();
  if (status === "CANCELADA" || status === "CANCELADO") {
    return "CANCELADO";
  }

  if (params.valorPago <= 0) {
    return "PENDENTE";
  }

  if (params.valorPago < params.valorTotal) {
    return "PARCIAL";
  }

  return "PAGO";
}

export function calcularResumoFinanceiroOS(ordem: OrdemServicoFinanceiroInput) {
  const valorTotal = calcularValorTotalOS(ordem);
  const valorDesconto = normalizarDecimalParaNumero(ordem.valorDesconto, 0);
  const valorSinal = normalizarDecimalParaNumero(ordem.valorSinal, 0);
  const valorPago = calcularValorPago(ordem);
  const saldo = calcularSaldo(valorTotal, valorPago);
  const statusFinanceiro = calcularStatusFinanceiroDerivado({
    statusOperacional: ordem.statusOperacional,
    valorTotal,
    valorPago,
  });

  return {
    valorTotal,
    valorDesconto,
    valorSinal,
    valorPago,
    saldo,
    statusFinanceiro,
  };
}

export function normalizarValoresDecimalParaClient<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Prisma.Decimal.isDecimal(value)) {
    return normalizarDecimalParaNumero(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizarValoresDecimalParaClient(item)) as T;
  }

  if (typeof value === "object") {
    const entrada = value as Record<string, unknown>;
    const normalizado: Record<string, unknown> = {};

    Object.entries(entrada).forEach(([chave, campo]) => {
      normalizado[chave] = normalizarValoresDecimalParaClient(campo);
    });

    return normalizado as T;
  }

  return value;
}