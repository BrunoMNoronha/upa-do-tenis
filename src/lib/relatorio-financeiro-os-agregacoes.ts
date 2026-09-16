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
  /** Composição do Valor Total do conjunto filtrado: pago + saldo em aberto. */
  composicaoFinanceira: {
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

function contarPorChave(
  itens: ItemAgregavel[],
  ordem: readonly string[],
  chave: (item: ItemAgregavel) => string,
): ContagemPorStatus[] {
  const mapa = new Map<string, ContagemPorStatus>();
  for (const status of ordem) {
    mapa.set(status, { status, quantidade: 0, valorTotal: 0 });
  }

  for (const item of itens) {
    const status = chave(item);
    let entrada = mapa.get(status);
    if (!entrada) {
      // Status fora da ordem conhecida ainda é contado (nunca some silenciosamente).
      entrada = { status, quantidade: 0, valorTotal: 0 };
      mapa.set(status, entrada);
    }
    entrada.quantidade++;
    entrada.valorTotal += item.valorTotal;
  }

  return Array.from(mapa.values()).map((entrada) => ({
    ...entrada,
    valorTotal: arredondarMoeda(entrada.valorTotal),
  }));
}

export function calcularAgregadosRelatorio(itens: ItemAgregavel[]): RelatorioFinanceiroOSAgregados {
  const resumo = calcularResumoRelatorio(itens);

  return {
    composicaoFinanceira: {
      valorPago: resumo.valorPago,
      saldoAberto: resumo.saldoAberto,
    },
    porStatusFinanceiro: contarPorChave(itens, STATUS_FINANCEIRO_ORDEM, (item) => item.statusFinanceiro),
    porStatusOperacional: contarPorChave(itens, STATUS_OPERACIONAL_ORDEM, (item) => item.statusOperacional),
  };
}
