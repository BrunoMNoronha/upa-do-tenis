import { z } from "zod";

export const servicoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  descricao: z.string().optional(),
  precoBase: z.coerce.number().min(0, "O preço base não pode ser negativo."),
});

export type ServicoFormValues = z.infer<typeof servicoFormSchema>;
