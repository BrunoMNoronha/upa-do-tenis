import { z } from "zod";
import { TipoMovimentacao } from "./movimentacao-estoque-service";

// Inputs numéricos vazios chegam como NaN (valueAsNumber no client) ou null
// (NaN serializado em JSON); ambos devem ser tratados como "não informado".
const numeroOpcional = (schema: z.ZodNumber) =>
  z.preprocess((valor) => {
    if (valor === "" || valor === null || valor === undefined) return undefined;
    if (typeof valor === "number" && Number.isNaN(valor)) return undefined;
    return valor;
  }, schema.optional());

export const registrarMovimentacaoManualSchema = z.object({
  tipo: z.enum([
    TipoMovimentacao.ENTRADA_MANUAL,
    TipoMovimentacao.SAIDA_MANUAL,
    TipoMovimentacao.AJUSTE,
  ]),
  quantidade: numeroOpcional(z.number().min(0.01)),
  novoSaldo: numeroOpcional(z.number().min(0)),
  custoUnitario: numeroOpcional(z.number().min(0)),
  observacao: z.string().optional(),
  motivo: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.tipo === TipoMovimentacao.AJUSTE) {
    if (data.novoSaldo === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["novoSaldo"],
        message: "Informe o novo saldo para o ajuste.",
      });
    }
    if (!data.motivo || data.motivo.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo"],
        message: "O motivo é obrigatório para ajuste de saldo.",
      });
    }
  } else if (data.quantidade === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantidade"],
      message: "Informe a quantidade da movimentação.",
    });
  }
});

export type RegistrarMovimentacaoManualValues = z.infer<
  typeof registrarMovimentacaoManualSchema
>;
