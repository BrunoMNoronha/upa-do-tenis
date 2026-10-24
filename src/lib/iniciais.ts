const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"]);

/**
 * Iniciais de um nome para avatares e selos: primeira letra da primeira e da
 * última palavra relevante, ignorando partículas ("UPA do Tênis" → "UT",
 * "Marcos Alves" → "MA", "Ana" → "A"). Nome vazio devolve "?".
 */
export function iniciais(nome: string | null | undefined, maximo = 2): string {
  const partes = (nome ?? "")
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0 && !PARTICULAS.has(parte.toLocaleLowerCase("pt-BR")));

  if (partes.length === 0) {
    return "?";
  }

  const letras = partes.length === 1 ? [partes[0]] : [partes[0], partes[partes.length - 1]];

  return letras
    .map((parte) => parte.charAt(0))
    .join("")
    .slice(0, maximo)
    .toLocaleUpperCase("pt-BR");
}
