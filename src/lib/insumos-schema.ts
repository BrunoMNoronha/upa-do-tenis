import { z } from "zod";

export const insumoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  descricao: z.string().optional(),
  unidadeMedida: z.string().min(1, "A unidade de medida é obrigatória."),
  quantidadeEstoque: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  estoqueMinimo: z.coerce.number().min(0, "O estoque mínimo não pode ser negativo."),
  custoUnitario: z.coerce.number().min(0, "O custo não pode ser negativo."),
});

export type InsumoFormValues = z.infer<typeof insumoFormSchema>;
