import { z } from "zod";

export const abrirCaixaSchema = z.object({
  saldoInicial: z.coerce.number().min(0, "O saldo inicial não pode ser negativo."),
  observacao: z.string().optional(),
});
export type AbrirCaixaValues = z.infer<typeof abrirCaixaSchema>;

export const fecharCaixaSchema = z.object({
  saldoFinalInformado: z.coerce.number().min(0, "O saldo final não pode ser negativo."),
  observacao: z.string().optional(),
});
export type FecharCaixaValues = z.infer<typeof fecharCaixaSchema>;

export const movimentacaoCaixaSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA", "SANGRIA", "REFORCO"], {
    required_error: "O tipo de movimentação é obrigatório.",
  }),
  valor: z.coerce.number().positive("O valor deve ser maior que zero."),
  descricao: z.string().min(3, "A descrição deve ter no mínimo 3 caracteres."),
  formaPagamentoId: z.string().optional(),
});
export type MovimentacaoCaixaValues = z.infer<typeof movimentacaoCaixaSchema>;
