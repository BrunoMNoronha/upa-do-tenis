import { FUSO_OPERACIONAL } from "./date-range";

export const PREFIXO_REGISTRO_RETROATIVO = "[REGISTRO RETROATIVO]";

const LIMITE_JUSTIFICATIVA = 500;

export interface ObservacaoRegistroRetroativoParams {
  /** Data operacional informada pelo operador, no formato "YYYY-MM-DD". */
  dataOperacional: string;
  /** Momento técnico do registro (equivalente ao criadoEm da OS). */
  registradoEm: Date;
  usuarioNome: string;
  justificativa: string;
}

/** Converte "YYYY-MM-DD" em "DD/MM/AAAA" sem construir Date (sem risco de fuso). */
function formatarDataIsoParaBr(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Formata data e hora no fuso da operação como "DD/MM/AAAA HH:mm". */
function formatarDataHoraOperacional(data: Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_OPERACIONAL,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);

  const buscar = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${buscar("day")}/${buscar("month")}/${buscar("year")} ${buscar("hour")}:${buscar("minute")}`;
}

function normalizarJustificativa(justificativa: string): string {
  const texto = justificativa.trim().replace(/\s+/g, " ");

  if (texto.length <= LIMITE_JUSTIFICATIVA) {
    return texto;
  }

  return `${texto.slice(0, LIMITE_JUSTIFICATIVA)}…`;
}

/**
 * Monta a observação do HistoricoStatus que registra a criação de OS com data
 * operacional retroativa. A dataEntrada (operacional) e o criadoEm (técnico) da
 * OS continuam sendo a fonte estruturada; este texto é a leitura auditável.
 */
export function montarObservacaoRegistroRetroativo(
  params: ObservacaoRegistroRetroativoParams,
): string {
  return [
    `${PREFIXO_REGISTRO_RETROATIVO} Data operacional informada: ${formatarDataIsoParaBr(params.dataOperacional)}`,
    `Registrado no sistema em: ${formatarDataHoraOperacional(params.registradoEm)}`,
    `Usuário: ${params.usuarioNome}`,
    `Justificativa: ${normalizarJustificativa(params.justificativa)}`,
  ].join(" | ");
}
