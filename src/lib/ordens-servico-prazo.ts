import { dataOperacional, formatarDataLocal, parseDataLocal } from "./date-range";

const DOMINGO = 0;

/**
 * Sugere o prazo previsto padrão para uma nova OS: `dias` dias corridos a
 * partir da data de entrada, sem contar domingos (a oficina não trabalha).
 *
 * É apenas o valor inicial do campo no formulário; o operador pode alterar
 * livremente e a validação continua a mesma (`prazoPrevisto` obrigatório).
 *
 * Exemplo: entrada em quarta 2026-09-16 → 17, 18, 19 (sáb), pula domingo 20,
 * 21, 22 → retorna "2026-09-22".
 */
export function calcularPrazoPrevistoPadrao(dataEntrada: string, dias = 5): string {
  const data = parseDataLocal(dataEntrada);
  if (Number.isNaN(data.getTime())) return "";

  let restantes = Math.max(0, Math.floor(dias));
  while (restantes > 0) {
    data.setDate(data.getDate() + 1);
    if (data.getDay() !== DOMINGO) restantes -= 1;
  }
  return formatarDataLocal(data);
}

/** Dia civil ("YYYY-MM-DD") de uma data ou ISO no fuso da operação. */
function diaOperacional(valor: Date | string): string | null {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return Number.isNaN(data.getTime()) ? null : dataOperacional(data);
}

function diaParaUtc(dia: string): number {
  const [ano, mes, diaMes] = dia.split("-").map(Number);
  return Date.UTC(ano, mes - 1, diaMes);
}

/**
 * Diferença em dias civis (fuso da operação) de `de` até `ate`: positiva
 * quando `ate` é posterior. Datas inválidas devolvem 0.
 */
export function diferencaDiasOperacionais(de: Date | string, ate: Date | string): number {
  const inicio = diaOperacional(de);
  const fim = diaOperacional(ate);
  if (!inicio || !fim) return 0;
  return Math.round((diaParaUtc(fim) - diaParaUtc(inicio)) / 86_400_000);
}

export type DescricaoPrazo = {
  /** "dd/mm" da previsão, ou "—" quando cancelada/sem previsão. */
  dataCurta: string;
  texto: string;
  tom: "danger" | "warning" | "neutral" | "success";
};

type OrdemParaPrazo = {
  status: string;
  dataPrevisao: string | Date | null;
  historicosStatus?: ReadonlyArray<{ statusNovo: string; criadoEm: string | Date }>;
};

function formatarDiaMes(valor: Date | string): string {
  const dia = diaOperacional(valor);
  if (!dia) return "—";
  const [, mes, diaMes] = dia.split("-");
  return `${diaMes}/${mes}`;
}

function dataDoStatus(ordem: OrdemParaPrazo, status: string): string | null {
  const registro = ordem.historicosStatus?.find((historico) => historico.statusNovo === status);
  return registro ? formatarDiaMes(registro.criadoEm) : null;
}

function plural(n: number, singular: string, pluralTexto: string) {
  return n === 1 ? `1 ${singular}` : `${n} ${pluralTexto}`;
}

/**
 * Texto relativo do prazo na listagem: "4 dias atrasada", "vence hoje",
 * "em 2 dias", "entregue em 15/09", "cancelada em 14/09". Apenas exibição;
 * a regra de atraso é a mesma de `ordemServicoEstaAtrasada`.
 */
export function descreverPrazo(ordem: OrdemParaPrazo, agora: Date = new Date()): DescricaoPrazo {
  const previsao = ordem.dataPrevisao ? formatarDiaMes(ordem.dataPrevisao) : "—";

  if (ordem.status === "CANCELADA") {
    const quando = dataDoStatus(ordem, "CANCELADA");
    return { dataCurta: "—", texto: quando ? `cancelada em ${quando}` : "cancelada", tom: "neutral" };
  }
  if (ordem.status === "ENTREGUE") {
    const quando = dataDoStatus(ordem, "ENTREGUE");
    return { dataCurta: previsao, texto: quando ? `entregue em ${quando}` : "entregue", tom: "success" };
  }
  if (ordem.status === "CONCLUIDA") {
    const quando = dataDoStatus(ordem, "CONCLUIDA");
    return { dataCurta: previsao, texto: quando ? `concluída em ${quando}` : "concluída", tom: "success" };
  }
  if (!ordem.dataPrevisao) {
    return { dataCurta: "—", texto: "sem previsão", tom: "neutral" };
  }

  const dias = diferencaDiasOperacionais(agora, ordem.dataPrevisao);
  if (dias < 0) return { dataCurta: previsao, texto: `${plural(-dias, "dia", "dias")} atrasada`, tom: "danger" };
  if (dias === 0) return { dataCurta: previsao, texto: "vence hoje", tom: "warning" };
  return { dataCurta: previsao, texto: `em ${plural(dias, "dia", "dias")}`, tom: "neutral" };
}
