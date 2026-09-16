import { FUSO_OPERACIONAL } from "@/lib/date-range";

/**
 * Helpers puros do cabeçalho do Dashboard. Calculados no servidor a partir
 * do fuso da operação para não depender do relógio do navegador nem gerar
 * divergência de hidratação.
 */

export type Saudacao = "Bom dia" | "Boa tarde" | "Boa noite";

/** Hora local (0-23) no fuso da operação para o instante informado. */
export function horaOperacional(referencia: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_OPERACIONAL,
    hourCycle: "h23",
    hour: "2-digit",
  }).formatToParts(referencia);

  return Number(partes.find((parte) => parte.type === "hour")?.value ?? 0);
}

/** Saudação por faixa de horário: 5h-11h manhã, 12h-17h tarde, demais noite. */
export function saudacaoPorHora(hora: number): Saudacao {
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

/** Primeiro nome do usuário, ou null quando não há nome utilizável. */
export function primeiroNome(nome: string | null | undefined): string | null {
  const limpo = (nome ?? "").trim();
  if (!limpo) return null;
  return limpo.split(/\s+/)[0];
}

/** Título do cabeçalho: "Bom dia, Marcos" ou apenas "Bom dia" sem nome. */
export function montarSaudacao(nome: string | null | undefined, referencia: Date = new Date()): string {
  const saudacao = saudacaoPorHora(horaOperacional(referencia));
  const primeiro = primeiroNome(nome);
  return primeiro ? `${saudacao}, ${primeiro}` : saudacao;
}

const formatadorDataLonga = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_OPERACIONAL,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Data por extenso em pt-BR, ex.: "Quarta-feira, 16 de setembro de 2026". */
export function formatarDataCabecalho(referencia: Date = new Date()): string {
  const texto = formatadorDataLonga.format(referencia);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
