/**
 * Utilitários de intervalo de datas para filtros de relatórios e dashboard.
 *
 * Regra homologada: filtros de data representam dias completos no fuso local.
 * O intervalo é semiaberto: >= início do dia inicial e < início do dia
 * seguinte ao dia final, garantindo que registros criados no próprio dia
 * final (inclusive "hoje") sejam incluídos.
 */

const FORMATO_DATA_ISO_CURTA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte uma string de data em Date no fuso local.
 * Strings "YYYY-MM-DD" seriam interpretadas como meia-noite UTC por
 * `new Date(str)` (voltando um dia em fusos negativos como o do Brasil);
 * aqui elas são parseadas como meia-noite local.
 */
export function parseDataLocal(valor: string): Date {
  if (FORMATO_DATA_ISO_CURTA.test(valor)) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }
  return new Date(valor);
}

/** Retorna nova Date em meia-noite local do dia informado. */
export function inicioDoDia(data: Date): Date {
  const resultado = new Date(data);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
}

/** Retorna nova Date em meia-noite local do dia seguinte ao informado. */
export function inicioDoDiaSeguinte(data: Date): Date {
  const resultado = inicioDoDia(data);
  resultado.setDate(resultado.getDate() + 1);
  return resultado;
}

/**
 * Formata uma Date como "YYYY-MM-DD" usando componentes locais.
 * `toISOString().split("T")[0]` converte para UTC antes de formatar,
 * deslocando a data em fusos negativos (ex.: UTC-3) sempre que o horário
 * local cai perto da virada do dia.
 */
export function formatarDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export type PresetIntervalo = "hoje" | "semana" | "mes" | "mesAtual";

/**
 * Calcula início/fim (strings "YYYY-MM-DD" locais) de um preset de período,
 * a partir de uma data de referência (padrão: agora).
 */
export function calcularIntervaloPreset(
  preset: PresetIntervalo,
  referencia: Date = new Date()
): { inicio: string; fim: string } {
  const fim = formatarDataLocal(referencia);

  switch (preset) {
    case "hoje":
      return { inicio: fim, fim };
    case "semana": {
      const inicio = new Date(referencia);
      inicio.setDate(referencia.getDate() - 7);
      return { inicio: formatarDataLocal(inicio), fim };
    }
    case "mes": {
      const inicio = new Date(referencia);
      inicio.setDate(referencia.getDate() - 30);
      return { inicio: formatarDataLocal(inicio), fim };
    }
    case "mesAtual": {
      const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
      return { inicio: formatarDataLocal(inicio), fim };
    }
  }
}
