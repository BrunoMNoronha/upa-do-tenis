import { sanitizeCPFCNPJ, sanitizeCurrency, sanitizePhone } from "./sanitizers";

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

/**
 * Máscara progressiva de telefone para digitação: aceita apenas dígitos,
 * limita a 11 e aplica máscara parcial conforme o usuário digita.
 * (10 dígitos: fixo "(DD) 9999-9999"; 11 dígitos: celular "(DD) 99999-9999")
 */
export function maskPhone(value: string | null | undefined): string {
  const digits = sanitizePhone(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Máscara progressiva de CPF/CNPJ para digitação: aceita apenas dígitos,
 * limita a 14 e alterna dinamicamente entre CPF (até 11 dígitos) e CNPJ (12+).
 */
export function maskCPFCNPJ(value: string | null | undefined): string {
  const digits = sanitizeCPFCNPJ(value).slice(0, 14);
  if (digits.length === 0) return "";
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
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

/**
 * Máscara monetária de digitação por centavos (padrão operacional de balcão):
 * considera apenas os dígitos e interpreta os 2 últimos como centavos,
 * formatando como BRL a cada tecla — "15050" vira "R$ 150,50".
 * Campo vazio (ou sem dígitos) permanece vazio; limite de 10 dígitos
 * (R$ 99.999.999,99) para evitar valores absurdos por engano.
 */
export function maskCurrency(value: string | null | undefined): string {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  const cents = parseInt(digits, 10);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  
  const numVal = sanitizeCurrency(value);
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numVal);
}
