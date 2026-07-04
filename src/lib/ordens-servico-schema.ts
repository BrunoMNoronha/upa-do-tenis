import { z } from "zod";

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  if (typeof val === "string") {
    if (val.trim() === "") return 0;
    const parsed = parseFloat(val.replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  }
  return Number(val) || 0;
}, z.number().min(0, minMessage));

export const ordemServicoFormSchema = z.object({
  clienteId: z.string().min(1, "O cliente é obrigatório."),
  itemRecebido: z.string().min(2, "A descrição do item é obrigatória."),
  servicoId: z.string().optional(),
  prazoPrevisto: z.string().min(1, "A data de previsão é obrigatória."),
  valorEstimado: safeNumber("O valor não pode ser negativo."),
  observacoes: z.string().optional(),
});

export type OrdemServicoFormValues = z.infer<typeof ordemServicoFormSchema>;

export const statusUpdateSchema = z.object({
  statusNovo: z.enum(["EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE"], {
    errorMap: () => ({ message: "Status inválido." }),
  }),
  observacao: z.string().optional(),
});

export type StatusUpdateValues = z.infer<typeof statusUpdateSchema>;

export const ordemServicoIdParamsSchema = z.object({
  id: z.string().min(1, "ID da Ordem de Serviço é obrigatório."),
});
