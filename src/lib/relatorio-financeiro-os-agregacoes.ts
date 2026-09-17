import { arredondarMoeda, StatusFinanceiro } from './ordens-servico-financeiro';

/**
 * Agregações puras do Relatório Financeiro de OS.
 *
 * Este módulo NÃO reimplementa nenhuma regra financeira: ele apenas conta e
 * soma valores já produzidos por `calcularResumoFinanceiroOS` (statusFinanceiro,
 * valorTotal, valorPago, saldo). Qualquer mudança de regra deve acontecer em
 * `ordens-servico-financeiro.ts`, nunca aqui.
 */

export const STATUS_FINANCEIRO_ORDEM: StatusFinanceiro[] = ['PENDENTE', 'PARCIAL', 'PAGO', 'CANCELADO'];
export const STATUS_OPERACIONAL_ORDEM = ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'ENTREGUE', 'CANCELADA'] as const;

export interface ItemAgregavel {
  statusOperacional: string;
  statusFinanceiro: string;
  valorTotal: number;
  valorPago: number;
  saldo: number;
}

export interface ContagemPorStatus {
  status: string;
  quantidade: number;
  valorTotal: number;
}

export interface RelatorioFinanceiroOSResumo {
  quantidadeOS: number;
  valorTotal: number;
  valorPago: number;
  saldoAberto: number;
  quantidadeComSaldoAberto: number;
}

export interface RelatorioFinanceiroOSAgregados {
  /**
   * Composição do Valor Total do conjunto filtrado. Em regra, pago + saldo =
   * valorTotal; em OS legadas com sobrepagamento (saldo zerado e pago maior
   * que o total) a soma excede o total, por isso `valorTotal` é devolvido
   * explicitamente como base do gráfico.
   */
  composicaoFinanceira: {
    valorTotal: number;
    valorPago: number;
    saldoAberto: number;
  };
  /** Quantidade de OS por status financeiro, na ordem fixa do domínio. */
  porStatusFinanceiro: ContagemPorStatus[];
  /** Quantidade de OS por status operacional, na ordem fixa do domínio. */
  porStatusOperacional: ContagemPorStatus[];
}

export function calcularResumoRelatorio(itens: ItemAgregavel[]): RelatorioFinanceiroOSResumo {
  let quantidadeOS = 0;
  let valorTotal = 0;
  let valorPago = 0;
  let saldoAberto = 0;
  let quantidadeComSaldoAberto = 0;

  for (const item of itens) {
    quantidadeOS++;
    valorTotal += item.valorTotal;
    valorPago += item.valorPago;
    saldoAberto += item.saldo;
    if (item.saldo > 0) {
      quantidadeComSaldoAberto++;
    }
  }

  return {
    quantidadeOS,
    valorTotal: arredondarMoeda(valorTotal),
    valorPago: arredondarMoeda(valorPago),
    saldoAberto: arredondarMoeda(saldoAberto),
    quantidadeComSaldoAberto,
  };
}

/**
 * Realiza o cálculo combinado de resumo e agregados em uma única varredura O(N)
 * sobre o array de itens, evitando iterações e alocações de mapas redundantes.
 */
export function calcularResumoEAgregadosRelatorio(itens: ItemAgregavel[]): {
  resumo: RelatorioFinanceiroOSResumo;
  agregados: RelatorioFinanceiroOSAgregados;
} {
  let quantidadeOS = 0;
  let valorTotal = 0;
  let valorPago = 0;
  let saldoAberto = 0;
  let quantidadeComSaldoAberto = 0;

  const finMap = new Map<string, ContagemPorStatus>();
  for (const status of STATUS_FINANCEIRO_ORDEM) {
    finMap.set(status, { status, quantidade: 0, valorTotal: 0 });
  }

  const opMap = new Map<string, ContagemPorStatus>();
  for (const status of STATUS_OPERACIONAL_ORDEM) {
    opMap.set(status, { status, quantidade: 0, valorTotal: 0 });
  }

  for (const item of itens) {
    quantidadeOS++;
    valorTotal += item.valorTotal;
    valorPago += item.valorPago;
    saldoAberto += item.saldo;
    if (item.saldo > 0) {
      quantidadeComSaldoAberto++;
    }

    let entradaFin = finMap.get(item.statusFinanceiro);
    if (!entradaFin) {
      entradaFin = { status: item.statusFinanceiro, quantidade: 0, valorTotal: 0 };
      finMap.set(item.statusFinanceiro, entradaFin);
    }
    entradaFin.quantidade++;
    entradaFin.valorTotal += item.valorTotal;

    let entradaOp = opMap.get(item.statusOperacional);
    if (!entradaOp) {
      entradaOp = { status: item.statusOperacional, quantidade: 0, valorTotal: 0 };
      opMap.set(item.statusOperacional, entradaOp);
    }
    entradaOp.quantidade++;
    entradaOp.valorTotal += item.valorTotal;
  }

  const resumo: RelatorioFinanceiroOSResumo = {
    quantidadeOS,
    valorTotal: arredondarMoeda(valorTotal),
    valorPago: arredondarMoeda(valorPago),
    saldoAberto: arredondarMoeda(saldoAberto),
    quantidadeComSaldoAberto,
  };

  const porStatusFinanceiro: ContagemPorStatus[] = Array.from(finMap.values()).map((entrada) => ({
    ...entrada,
    valorTotal: arredondarMoeda(entrada.valorTotal),
  }));

  const porStatusOperacional: ContagemPorStatus[] = Array.from(opMap.values()).map((entrada) => ({
    ...entrada,
    valorTotal: arredondarMoeda(entrada.valorTotal),
  }));

  const agregados: RelatorioFinanceiroOSAgregados = {
    composicaoFinanceira: {
      valorTotal: resumo.valorTotal,
      valorPago: resumo.valorPago,
      saldoAberto: resumo.saldoAberto,
    },
    porStatusFinanceiro,
    porStatusOperacional,
  };

  return { resumo, agregados };
}

export function calcularAgregadosRelatorio(itens: ItemAgregavel[]): RelatorioFinanceiroOSAgregados {
  return calcularResumoEAgregadosRelatorio(itens).agregados;
}
