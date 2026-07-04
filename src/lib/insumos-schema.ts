import { z } from "zod";

import { sanitizeCurrency } from "./sanitizers";

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  return sanitizeCurrency(val as any);
}, z.number().min(0, minMessage));

export const insumoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  descricao: z.string().optional(),
  unidadeMedida: z.string().min(1, "A unidade de medida é obrigatória."),
  quantidadeEstoque: safeNumber("A quantidade não pode ser negativa."),
  estoqueMinimo: safeNumber("O estoque mínimo não pode ser negativo."),
  custoUnitario: safeNumber("O custo não pode ser negativo."),
});

export type InsumoFormValues = z.infer<typeof insumoFormSchema>;
