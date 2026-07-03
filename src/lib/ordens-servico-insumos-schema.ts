import { z } from "zod";

export const registrarInsumoItemOrdemServicoSchema = z.object({
  itemOrdemServicoId: z.string().min(1, "O item da OS é obrigatório."),
  insumoId: z.string().min(1, "O insumo é obrigatório."),
  quantidade: z.coerce.number().positive("A quantidade deve ser maior que zero."),
  custoUnitarioAplicado: z.coerce
    .number()
    .min(0, "O custo unitário aplicado deve ser maior ou igual a zero."),
  observacoes: z.string().trim().optional(),
});

export type RegistrarInsumoItemOrdemServicoValues = z.infer<
  typeof registrarInsumoItemOrdemServicoSchema
>;