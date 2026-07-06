import { z } from "zod";

export const formaPagamentoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  // Obrigatório e normalizado para maiúsculas: o caixa identifica dinheiro físico
  // comparando este campo com "DINHEIRO" (ver src/lib/caixa.ts). Um tipo vazio ou
  // com grafia divergente faz o valor não ser contabilizado no saldo físico.
  tipo: z
    .string()
    .trim()
    .min(1, "Informe o tipo (ex: DINHEIRO, PIX, CARTAO_CREDITO, CARTAO_DEBITO). É usado para identificar dinheiro físico no caixa.")
    .transform((valor) => valor.toUpperCase()),
});

export type FormaPagamentoFormValues = z.infer<typeof formaPagamentoFormSchema>;
