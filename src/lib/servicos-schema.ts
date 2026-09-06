import { z } from "zod";

import { sanitizeCurrency } from "./sanitizers";

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  return sanitizeCurrency(val as any);
}, z.number().min(0, minMessage));

export const servicoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  descricao: z.string().optional(),
  precoBase: safeNumber("O preço base não pode ser negativo."),
  ativo: z.boolean().optional(),
});

export const servicoAtualizarSchema = servicoFormSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export type ServicoFormValues = z.infer<typeof servicoFormSchema>;
export type ServicoAtualizarValues = z.infer<typeof servicoAtualizarSchema>;
