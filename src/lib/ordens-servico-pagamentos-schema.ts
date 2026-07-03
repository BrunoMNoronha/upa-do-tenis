import { z } from "zod";

export const registrarPagamentoOrdemServicoSchema = z.object({
  formaPagamentoId: z.string().min(1, "A forma de pagamento é obrigatória."),
  tipo: z.string().trim().min(1, "O tipo do pagamento é obrigatório.").optional(),
  valor: z.coerce.number().positive("O valor do pagamento deve ser maior que zero."),
  dataPagamento: z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), {
    message: "A data de pagamento é inválida.",
  }),
  observacoes: z.string().trim().optional(),
});

export type RegistrarPagamentoOrdemServicoValues = z.infer<
  typeof registrarPagamentoOrdemServicoSchema
>;