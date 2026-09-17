import { z } from "zod";

import { instanteDoDiaOperacional } from "./date-range";

const FORMATO_DIA_OPERACIONAL = /^\d{4}-\d{2}-\d{2}$/;

export const registrarPagamentoOrdemServicoSchema = z.object({
  formaPagamentoId: z.string().min(1, "A forma de pagamento é obrigatória."),
  tipo: z.string().trim().min(1, "O tipo do pagamento é obrigatório.").optional(),
  valor: z.coerce.number().positive("O valor do pagamento deve ser maior que zero."),
  // O formulário envia o dia (input type=date); instantes ISO completos seguem aceitos.
  dataPagamento: z
    .preprocess(
      (value) =>
        typeof value === "string" && FORMATO_DIA_OPERACIONAL.test(value)
          ? instanteDoDiaOperacional(value)
          : value,
      z.coerce.date(),
    )
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: "A data de pagamento é inválida.",
    }),
  observacoes: z.string().trim().optional(),
});

export type RegistrarPagamentoOrdemServicoValues = z.infer<
  typeof registrarPagamentoOrdemServicoSchema
>;
