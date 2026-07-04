import { z } from "zod";
import { sanitizePhone, sanitizeCPFCNPJ, sanitizeEmail, sanitizeText } from "./sanitizers";
import { isValidPhone, isValidCPFCNPJ } from "./validators";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}, z.string().optional());

export const clienteFormSchema = z.object({
  nome: z.preprocess((val) => typeof val === "string" ? sanitizeText(val) : val, z.string().min(1, "Informe o nome do cliente.")),
  telefone: z.preprocess((val) => typeof val === "string" ? sanitizePhone(val) : val, z.string().min(1, "Informe o telefone do cliente.")
    .refine(val => isValidPhone(val), "Telefone inválido.")),
  email: z.preprocess((val) => typeof val === "string" ? sanitizeEmail(val) || undefined : val, z.string().optional()
    .refine(val => !val || z.string().email().safeParse(val).success, "Informe um e-mail válido.")),
  cpfCnpj: z.preprocess((val) => typeof val === "string" ? sanitizeCPFCNPJ(val) || undefined : val, z.string().optional()
    .refine(val => isValidCPFCNPJ(val), "CPF ou CNPJ inválido.")),
  observacoes: optionalTrimmedString,
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;