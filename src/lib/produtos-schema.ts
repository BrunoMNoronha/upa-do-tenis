import { z } from "zod";

import { sanitizeCurrency } from "./sanitizers";

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  return sanitizeCurrency(val as any);
}, z.number().min(0, minMessage));

export const produtoBaseSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  descricao: z.string().optional(),
  precoVenda: safeNumber("O preço de venda não pode ser negativo."),
});

export const produtoFormSchema = produtoBaseSchema.extend({
  quantidadeInicial: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, z.number().int("A quantidade inicial deve ser um número inteiro.").min(0, "A quantidade inicial não pode ser negativa.").optional()),
});

export const produtoAtualizarSchema = produtoBaseSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export type ProdutoFormValues = z.infer<typeof produtoFormSchema>;
export type ProdutoAtualizarValues = z.infer<typeof produtoAtualizarSchema>;
