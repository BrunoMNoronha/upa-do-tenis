export interface RecebimentoDia {
  /** Dia "YYYY-MM-DD" no fuso da operação. */
  dia: string;
  /**
   * Recebido líquido do dia: pagamentos menos estornos feitos no dia (mesma
   * base do KPI "Total recebido"). Pode ser negativo num dia só com estorno.
   */
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
 * Um item por dia do período, na ordem do período, com zero nos dias sem
 * recebimento. `totaisPorDia` vem já somado no servidor (com precisão
 * decimal); dias fora do período são ignorados.
 */
export function montarRecebimentosPorDia(
  dias: string[],
  totaisPorDia: ReadonlyMap<string, number>,
): RecebimentoDia[] {
  return dias.map((dia) => ({ dia, valor: totaisPorDia.get(dia) ?? 0 }));
}
