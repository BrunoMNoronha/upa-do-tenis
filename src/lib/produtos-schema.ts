import { z } from "zod";

import { sanitizeCurrency } from "./sanitizers";

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  return sanitizeCurrency(val as any);
}, z.number().min(0, minMessage));

export const produtoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  descricao: z.string().optional(),
  precoVenda: safeNumber("O preço de venda não pode ser negativo."),
});

export const produtoAtualizarSchema = produtoFormSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export type ProdutoFormValues = z.infer<typeof produtoFormSchema>;
export type ProdutoAtualizarValues = z.infer<typeof produtoAtualizarSchema>;
