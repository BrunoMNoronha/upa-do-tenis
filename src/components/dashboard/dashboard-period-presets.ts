import { formatarDataLocal } from "@/lib/date-range";

/**
 * Presets de período do Dashboard. Todas as datas são strings "YYYY-MM-DD"
 * em dia local, no mesmo contrato do DateRangePicker e da API.
 */

export type PresetPeriodo = "hoje" | "7dias" | "esteMes" | "mesAnterior";

/** Estado do seletor: um preset reconhecido ou intervalo personalizado. */
export type PresetSelecionado = PresetPeriodo | "personalizado";

export type Periodo = { inicio: string; fim: string };

export const PRESETS_PERIODO: ReadonlyArray<{ id: PresetPeriodo; rotulo: string }> = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "7dias", rotulo: "7 dias" },
  { id: "esteMes", rotulo: "Este mês" },
  { id: "mesAnterior", rotulo: "Mês anterior" },
];

/** Calcula início/fim de um preset a partir de uma data de referência local. */
export function calcularPeriodoPreset(preset: PresetPeriodo, referencia: Date = new Date()): Periodo {
  const hoje = formatarDataLocal(referencia);

  switch (preset) {
    case "hoje":
      return { inicio: hoje, fim: hoje };
    case "7dias": {
      // Sete dias corridos incluindo hoje (hoje e os seis anteriores).
      const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() - 6);
      return { inicio: formatarDataLocal(inicio), fim: hoje };
    }
    case "esteMes": {
      const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
      return { inicio: formatarDataLocal(inicio), fim: hoje };
    }
    case "mesAnterior": {
      const inicio = new Date(referencia.getFullYear(), referencia.getMonth() - 1, 1);
      // Dia 0 do mês atual = último dia do mês anterior.
      const fim = new Date(referencia.getFullYear(), referencia.getMonth(), 0);
      return { inicio: formatarDataLocal(inicio), fim: formatarDataLocal(fim) };
    }
  }
}

/**
 * Identifica qual preset corresponde exatamente ao intervalo informado, ou
 * "personalizado" quando nenhum bate. Usado para marcar o chip ativo sem
 * guardar estado duplicado.
 */
export function identificarPreset(periodo: Periodo, referencia: Date = new Date()): PresetSelecionado {
  for (const { id } of PRESETS_PERIODO) {
    const candidato = calcularPeriodoPreset(id, referencia);
    if (candidato.inicio === periodo.inicio && candidato.fim === periodo.fim) {
      return id;
    }
  }
  return "personalizado";
}
