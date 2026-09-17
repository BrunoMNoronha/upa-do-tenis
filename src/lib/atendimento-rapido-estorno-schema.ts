import { z } from "zod";

import { MOTIVO_ESTORNO_MAX, MOTIVO_ESTORNO_MIN } from "@/lib/ordens-servico-estornos-schema";

// Mesmas regras de motivo do estorno de pagamento de OS (#230).
export const estornarAtendimentoRapidoSchema = z.object({
  motivo: z
    .string({ required_error: "O motivo do estorno é obrigatório." })
    .trim()
    .min(MOTIVO_ESTORNO_MIN, `O motivo do estorno deve ter ao menos ${MOTIVO_ESTORNO_MIN} caracteres.`)
    .max(MOTIVO_ESTORNO_MAX, `O motivo do estorno deve ter no máximo ${MOTIVO_ESTORNO_MAX} caracteres.`),
});

export const estornoAtendimentoRapidoParamsSchema = z.object({
  id: z.string().min(1, "ID do atendimento rápido é obrigatório."),
});

export type EstornarAtendimentoRapidoValues = z.infer<typeof estornarAtendimentoRapidoSchema>;
