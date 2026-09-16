import { formatarDataLocal, parseDataLocal } from "./date-range";

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
