import { dataOperacional } from './date-range';

export interface RecebimentoDia {
  /** Dia "YYYY-MM-DD" no fuso da operação. */
  dia: string;
  /** Soma dos pagamentos do dia (mesma base do KPI "Total recebido"). */
  valor: number;
}

/**
 * Maior período (em dias, inclusive) para o qual a série diária é montada.
 * Acima disso a série vem `null`: o gráfico não comporta tantas barras e a
 * consulta de pagamentos individuais deixaria de ser pequena.
 */
export const LIMITE_DIAS_RECEBIMENTOS_POR_DIA = 92;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function diaComoUtc(dia: string): number {
  const [ano, mes, diaDoMes] = dia.split('-').map(Number);
  return Date.UTC(ano, mes - 1, diaDoMes);
}

/**
 * Dias civis "YYYY-MM-DD" de `dataInicio` a `dataFim` (inclusive), ou `null`
 * quando o período passa de `LIMITE_DIAS_RECEBIMENTOS_POR_DIA`. Período
 * invertido devolve lista vazia. A contagem é feita sobre o calendário (UTC
 * como aritmética pura), sem depender do fuso do processo.
 */
export function listarDiasDoPeriodo(dataInicio: string, dataFim: string): string[] | null {
  const inicio = diaComoUtc(dataInicio);
  const fim = diaComoUtc(dataFim);

  if (Number.isNaN(inicio) || Number.isNaN(fim) || fim < inicio) {
    return [];
  }

  const quantidade = Math.round((fim - inicio) / MS_POR_DIA) + 1;
  if (quantidade > LIMITE_DIAS_RECEBIMENTOS_POR_DIA) {
    return null;
  }

  return Array.from({ length: quantidade }, (_, indice) =>
    new Date(inicio + indice * MS_POR_DIA).toISOString().slice(0, 10),
  );
}

/**
 * Agrupa pagamentos por dia do fuso da operação e devolve um item para cada
 * dia do período, com zero nos dias sem recebimento. A soma é feita em
 * centavos inteiros para não acumular erro de ponto flutuante; pagamentos
 * fora dos dias informados são ignorados.
 */
export function montarRecebimentosPorDia(
  dias: string[],
  pagamentos: { dataPagamento: Date; valor: unknown }[],
): RecebimentoDia[] {
  const centavosPorDia = new Map<string, number>(dias.map((dia) => [dia, 0]));

  for (const { dataPagamento, valor } of pagamentos) {
    const dia = dataOperacional(dataPagamento);
    const acumulado = centavosPorDia.get(dia);
    if (acumulado === undefined) continue;
    centavosPorDia.set(dia, acumulado + Math.round(Number(valor) * 100));
  }

  return dias.map((dia) => ({ dia, valor: centavosPorDia.get(dia)! / 100 }));
}
