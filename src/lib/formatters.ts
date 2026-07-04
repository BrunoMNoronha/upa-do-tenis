import { sanitizeCurrency, sanitizePhone } from "./sanitizers";

export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return value;
}

export function formatCPFCNPJ(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  } else if (cleaned.length === 14) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }
  return value;
}

export function formatCEP(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return value;
}

/**
 * Gera um link para conversa no WhatsApp a partir de um telefone brasileiro.
 * Prefixa o código do país (55) para números nacionais de 10 ou 11 dígitos.
 * Retorna string vazia quando não há telefone válido (não deve gerar link).
 */
export function whatsappLink(value: string | null | undefined): string {
  const cleaned = sanitizePhone(value);
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `https://wa.me/55${cleaned}`;
  }
  return "";
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  
  const numVal = sanitizeCurrency(value);
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numVal);
}
