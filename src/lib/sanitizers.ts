export function sanitizePhone(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function sanitizeCPFCNPJ(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function sanitizeCEP(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function sanitizeCurrency(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  
  let cleaned = String(value).replace(/[R$\s]/g, "");
  cleaned = cleaned.replace(/[^\d.,]/g, "");

  if (cleaned.includes(",")) {
    // Se tem vírgula, removemos os pontos (separadores de milhar) e trocamos a vírgula por ponto
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Se não tem vírgula, mas tem ponto:
    // Se o ponto separa exatamente as duas últimas casas decimais (ex: 15.90), tratamos como decimal.
    // Caso contrário (ex: 1.500), removemos os pontos assumindo que é separador de milhar.
    if (/\.\d{1,2}$/.test(cleaned)) {
      const parts = cleaned.split(".");
      const decimal = parts.pop();
      cleaned = parts.join("") + "." + decimal;
    } else {
      cleaned = cleaned.replace(/\./g, "");
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function sanitizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().replace(/\s+/g, " ");
}

export function sanitizeEmail(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase();
}
