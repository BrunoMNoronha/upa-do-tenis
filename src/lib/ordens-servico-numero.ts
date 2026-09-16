/**
 * Composição do identificador operacional da OS.
 *
 * Regra homologada: OS-<DDMMAAAA da Data de Entrada>-<número informado>.
 * O número é informado pelo operador (não há sequência automática) e a data
 * usada é a operacional (dataEntrada), nunca o criadoEm técnico.
 */

const FORMATO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** O domínio atual do sufixo é numérico (ex.: "0124"); zeros à esquerda fazem parte do número. */
export const FORMATO_NUMERO_OS = /^\d+$/;

export const PREFIXO_NUMERO_OS = "OS";

/**
 * Converte "YYYY-MM-DD" em "DDMMYYYY" por manipulação de string, sem construir
 * Date — assim a data não desloca por fuso do navegador ou do servidor.
 */
export function formatarDataEntradaParaNumeroOS(dataEntrada: string): string {
  const valor = dataEntrada.trim();
  if (!FORMATO_DATA_ISO.test(valor)) {
    throw new Error("Data de entrada inválida para compor o número da OS. Use AAAA-MM-DD.");
  }
  const [ano, mes, dia] = valor.split("-");
  return `${dia}${mes}${ano}`;
}

/**
 * Monta o identificador completo da OS.
 *
 * @param dataEntrada Data de Entrada operacional no formato "YYYY-MM-DD".
 * @param numeroOS Número informado pelo operador, preservado como string (ex.: "0124").
 * @returns Ex.: formatarNumeroOS("2026-09-16", "0124") => "OS-16092026-0124"
 */
export function formatarNumeroOS(dataEntrada: string, numeroOS: string): string {
  const numero = numeroOS.trim();
  if (!FORMATO_NUMERO_OS.test(numero)) {
    throw new Error("Número da OS inválido. Informe apenas dígitos.");
  }
  return `${PREFIXO_NUMERO_OS}-${formatarDataEntradaParaNumeroOS(dataEntrada)}-${numero}`;
}

/**
 * Versão tolerante para prévia na interface: retorna null enquanto os dados
 * ainda não permitem compor o identificador, em vez de lançar erro.
 */
export function previaNumeroOS(dataEntrada: string | undefined, numeroOS: string | undefined): string | null {
  const numero = (numeroOS ?? "").trim();
  const data = (dataEntrada ?? "").trim();
  if (!FORMATO_DATA_ISO.test(data) || !FORMATO_NUMERO_OS.test(numero)) {
    return null;
  }
  return formatarNumeroOS(data, numero);
}
