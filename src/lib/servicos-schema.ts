import { z } from "zod";

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  if (typeof val === "string") {
    if (val.trim() === "") return 0;
    const parsed = parseFloat(val.replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  }
  return Number(val) || 0;
}, z.number().min(0, minMessage));

export const servicoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  descricao: z.string().optional(),
  precoBase: safeNumber("O preço base não pode ser negativo."),
});

export type ServicoFormValues = z.infer<typeof servicoFormSchema>;
