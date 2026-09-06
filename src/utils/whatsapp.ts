export const DDI_BRASIL = "55";

export function formatarNumeroWhatsApp(telefone: string): string | null {
  const somenteDigitos = telefone.replace(/\D/g, "");

  const len = somenteDigitos.length;

  if (len === 10 || len === 11) {
    return `${DDI_BRASIL}${somenteDigitos}`;
  }

  return null;
}
