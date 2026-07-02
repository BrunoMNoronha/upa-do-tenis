import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}, z.string().optional());

const optionalEmail = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}, z.string().email("Informe um e-mail válido.").optional());

export const clienteFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do cliente."),
  telefone: z.string().trim().min(1, "Informe o telefone do cliente."),
  email: optionalEmail,
  cpfCnpj: optionalTrimmedString,
  observacoes: optionalTrimmedString,
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;