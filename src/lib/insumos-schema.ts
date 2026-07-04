import { z } from "zod";

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  if (typeof val === "string") {
    if (val.trim() === "") return 0;
    const parsed = parseFloat(val.replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  }
  return Number(val) || 0;
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
