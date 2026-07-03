import { z } from "zod";
import { TipoMovimentacao } from "./movimentacao-estoque-service";

export const registrarMovimentacaoManualSchema = z.object({
  tipo: z.enum([
    TipoMovimentacao.ENTRADA_MANUAL,
    TipoMovimentacao.SAIDA_MANUAL,
    TipoMovimentacao.AJUSTE,
  ]),
  quantidade: z.number().min(0.01).optional(),
  novoSaldo: z.number().min(0).optional(),
  custoUnitario: z.number().min(0).optional(),
  observacao: z.string().optional(),
  motivo: z.string().optional(),
}).refine(
  (data) => {
    if (data.tipo === TipoMovimentacao.AJUSTE) {
      return data.novoSaldo !== undefined && data.motivo && data.motivo.trim().length > 0;
    }
    return data.quantidade !== undefined && data.quantidade > 0;
  },
  {
    message: "Para AJUSTE, informe novoSaldo e motivo. Para entradas/saídas, informe a quantidade.",
    path: ["tipo"],
  }
);

export type RegistrarMovimentacaoManualValues = z.infer<
  typeof registrarMovimentacaoManualSchema
>;
