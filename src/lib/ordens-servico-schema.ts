import { z } from "zod";

export const ordemServicoFormSchema = z.object({
  clienteId: z.string().min(1, "O cliente é obrigatório."),
  itemRecebido: z.string().min(2, "A descrição do item é obrigatória."),
  servicoId: z.string().optional(),
  prazoPrevisto: z.string().min(1, "A data de previsão é obrigatória."),
  valorEstimado: z.coerce.number().min(0, "O valor não pode ser negativo."),
  observacoes: z.string().optional(),
});

export type OrdemServicoFormValues = z.infer<typeof ordemServicoFormSchema>;
