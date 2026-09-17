/**
 * Aritmética monetária em centavos inteiros, sem ponto flutuante.
 *
 * Usada pelas regras do Atendimento Rápido, que exigem igualdade exata entre
 * a soma dos pagamentos e o total. O valor é lido como texto decimal
 * ("150.50", "150,5", 150.5) e convertido para inteiro por manipulação de
 * string; nenhuma conta passa por `number` fracionário. Módulo puro: serve ao
 * servidor e ao formulário no navegador.
 */

/** Maior valor aceito: R$ 99.999.999,99 (mesmo teto de dígitos de `maskCurrency`). */
export const CENTAVOS_MAXIMO = 9_999_999_999;

const FORMATO_DECIMAL = /^(\d{1,8})(?:[.,](\d{1,2}))?$/;

/**
 * Converte um valor monetário em centavos inteiros.
 *
 * Aceita string ou number com até duas casas decimais, sem sinal, sem
 * separador de milhar e sem notação científica. Retorna `null` para qualquer
 * entrada fora desse formato (inclusive negativos e `NaN`), deixando ao
 * chamador a mensagem de erro. Um `number` é lido pela sua representação
 * textual: `0.1 + 0.2` vira "0.30000000000000004" e é rejeitado, em vez de
 * arredondado em silêncio.
 */
export function paraCentavos(valor: unknown): number | null {
  let texto: string;

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return null;
    texto = String(valor);
  } else if (typeof valor === "string") {
    texto = valor.trim();
  } else {
    return null;
  }

  const partes = FORMATO_DECIMAL.exec(texto);
  if (!partes) return null;

  const reais = Number.parseInt(partes[1], 10);
  const fracao = Number.parseInt((partes[2] ?? "").padEnd(2, "0"), 10);
  const centavos = reais * 100 + fracao;

  return centavos <= CENTAVOS_MAXIMO ? centavos : null;
}

/** Representação decimal com duas casas ("150.50"), aceita pelo Prisma em campos Decimal. */
export function centavosParaDecimal(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0) {
    throw new Error("Valor em centavos inválido.");
  }

  const reais = Math.trunc(centavos / 100);
  const fracao = centavos % 100;
  return `${reais}.${String(fracao).padStart(2, "0")}`;
}

export function somarCentavos(valores: readonly number[]): number {
  return valores.reduce((acumulado, valor) => acumulado + valor, 0);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Apenas exibição: "R$ 150,50". */
export function formatarCentavos(centavos: number): string {
  return brl.format(centavos / 100);
}
