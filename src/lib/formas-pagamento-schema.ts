import { z } from "zod";

export const formaPagamentoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  tipo: z.string().optional(),
});

export type FormaPagamentoFormValues = z.infer<typeof formaPagamentoFormSchema>;
