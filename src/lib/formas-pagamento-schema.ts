import { z } from "zod";
import { TIPOS_FORMA_PAGAMENTO } from "./formas-pagamento-tipos";

export const formaPagamentoFormSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  // Enum controlado: o caixa identifica dinheiro físico comparando este campo
  // com "DINHEIRO" (ver src/lib/caixa.ts). Restringir a valores fixos elimina
  // o cadastro de tipo vazio ou com grafia divergente pela tela de cadastro.
  tipo: z.enum(TIPOS_FORMA_PAGAMENTO, {
    errorMap: () => ({ message: "Selecione um tipo válido." }),
  }),
});

export type FormaPagamentoFormValues = z.infer<typeof formaPagamentoFormSchema>;
