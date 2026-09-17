import { z } from "zod";

export const MOTIVO_ESTORNO_MIN = 5;
export const MOTIVO_ESTORNO_MAX = 500;

export const estornarPagamentoOrdemServicoSchema = z.object({
  motivo: z
    .string({ required_error: "O motivo do estorno é obrigatório." })
    .trim()
    .min(MOTIVO_ESTORNO_MIN, `O motivo do estorno deve ter ao menos ${MOTIVO_ESTORNO_MIN} caracteres.`)
    .max(MOTIVO_ESTORNO_MAX, `O motivo do estorno deve ter no máximo ${MOTIVO_ESTORNO_MAX} caracteres.`),
});

export const estornoPagamentoParamsSchema = z.object({
  id: z.string().min(1, "ID da Ordem de Serviço é obrigatório."),
  pagamentoId: z.string().min(1, "ID do pagamento é obrigatório."),
});

export type EstornarPagamentoOrdemServicoValues = z.infer<typeof estornarPagamentoOrdemServicoSchema>;
