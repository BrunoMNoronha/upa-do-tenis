export function isValidPhone(value: string | null | undefined): boolean {
  if (!value) return false;
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length === 10 || cleaned.length === 11;
}

export function isValidCPFCNPJ(value: string | null | undefined): boolean {
  if (!value) return true; // Optional by default
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length === 11 || cleaned.length === 14;
}
