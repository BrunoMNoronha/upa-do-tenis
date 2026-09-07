/**
 * Utilitários para tratamento de erros capturados em blocos `catch`.
 *
 * O TypeScript tipa o valor capturado como `unknown` porque qualquer valor pode
 * ser lançado (não apenas instâncias de `Error`). Estas funções fazem o
 * estreitamento de tipo de forma segura, evitando o uso de `any` e falhas em
 * tempo de execução quando o valor lançado não é um `Error`.
 */

const MENSAGEM_PADRAO = "Erro desconhecido.";

/**
 * Extrai a mensagem de um erro capturado.
 * Retorna `fallback` quando o valor não possui uma mensagem utilizável.
 */
export function getErrorMessage(error: unknown, fallback: string = MENSAGEM_PADRAO): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

/**
 * Extrai o código de erro do Prisma (ex.: "P2002", "P2025") quando presente.
 * Retorna `undefined` para erros que não expõem um código textual.
 */
export function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}
