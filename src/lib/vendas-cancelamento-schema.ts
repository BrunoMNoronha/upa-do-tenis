import { z } from "zod";

import { MOTIVO_ESTORNO_MAX, MOTIVO_ESTORNO_MIN } from "@/lib/ordens-servico-estornos-schema";

// Mesmas regras de motivo dos estornos de OS e de Atendimento Rápido.
export const cancelarVendaBalcaoSchema = z.object({
  motivo: z
    .string({ required_error: "O motivo do cancelamento é obrigatório." })
    .trim()
    .min(MOTIVO_ESTORNO_MIN, `O motivo do cancelamento deve ter ao menos ${MOTIVO_ESTORNO_MIN} caracteres.`)
    .max(MOTIVO_ESTORNO_MAX, `O motivo do cancelamento deve ter no máximo ${MOTIVO_ESTORNO_MAX} caracteres.`),
});

export type CancelarVendaBalcaoValues = z.infer<typeof cancelarVendaBalcaoSchema>;
