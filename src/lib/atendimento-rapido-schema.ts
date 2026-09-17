import { z } from "zod";

import { calcularAtendimentoRapido } from "@/lib/atendimento-rapido-calculo";
import { formatarCentavos, paraCentavos } from "@/lib/centavos";

export const ITENS_MAXIMOS_ATENDIMENTO = 50;
export const PAGAMENTOS_MAXIMOS_ATENDIMENTO = 10;
export const OBSERVACOES_TAMANHO_MAXIMO = 500;

/** Valor monetário positivo com até duas casas, convertido para centavos inteiros. */
function valorMonetarioPositivo(rotulo: string) {
  return z.union([z.string(), z.number()], {
    errorMap: () => ({ message: `${rotulo} é obrigatório.` }),
  }).transform((valor, ctx) => {
    const centavos = paraCentavos(valor);

    if (centavos === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${rotulo} inválido. Use um valor positivo com até duas casas decimais.`,
      });
      return z.NEVER;
    }

    if (centavos <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${rotulo} deve ser maior que zero.` });
      return z.NEVER;
    }

    return centavos;
  });
}

const itemAtendimentoRapidoSchema = z
  .object({
    servicoId: z.string().trim().min(1, "O serviço é obrigatório."),
    // Preço praticado no atendimento: começa no preço do catálogo, mas o
    // operador pode alterá-lo. Nunca altera Servico.precoBase.
    valor: valorMonetarioPositivo("O valor do serviço"),
  })
  .transform(({ servicoId, valor }) => ({ servicoId, valorCentavos: valor }));

const pagamentoAtendimentoRapidoSchema = z
  .object({
    formaPagamentoId: z.string().trim().min(1, "A forma de pagamento é obrigatória."),
    valor: valorMonetarioPositivo("O valor do pagamento"),
  })
  .transform(({ formaPagamentoId, valor }) => ({ formaPagamentoId, valorCentavos: valor }));

export const registrarAtendimentoRapidoSchema = z
  .object({
    // Gerada pelo formulário a cada novo atendimento e repetida em retries.
    chaveIdempotencia: z
      .string({ required_error: "A chave de envio é obrigatória." })
      .uuid("A chave de envio é inválida."),
    observacoes: z
      .string()
      .trim()
      .max(OBSERVACOES_TAMANHO_MAXIMO, `A observação deve ter no máximo ${OBSERVACOES_TAMANHO_MAXIMO} caracteres.`)
      .optional()
      .transform((valor) => (valor ? valor : undefined)),
    itens: z
      .array(itemAtendimentoRapidoSchema, { required_error: "Adicione ao menos um serviço." })
      .min(1, "Adicione ao menos um serviço.")
      .max(ITENS_MAXIMOS_ATENDIMENTO, `O atendimento aceita no máximo ${ITENS_MAXIMOS_ATENDIMENTO} serviços.`),
    pagamentos: z
      .array(pagamentoAtendimentoRapidoSchema, { required_error: "Informe ao menos uma forma de pagamento." })
      .min(1, "Informe ao menos uma forma de pagamento.")
      .max(
        PAGAMENTOS_MAXIMOS_ATENDIMENTO,
        `O atendimento aceita no máximo ${PAGAMENTOS_MAXIMOS_ATENDIMENTO} formas de pagamento.`,
      ),
  })
  .superRefine((dados, ctx) => {
    const formasVistas = new Set<string>();
    dados.pagamentos.forEach((pagamento, indice) => {
      if (formasVistas.has(pagamento.formaPagamentoId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Forma de pagamento repetida. Some os valores em uma única linha.",
          path: ["pagamentos", indice, "formaPagamentoId"],
        });
      }
      formasVistas.add(pagamento.formaPagamentoId);
    });

    const calculo = calcularAtendimentoRapido(dados.itens, dados.pagamentos);
    if (calculo.diferencaCentavos !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `A soma dos pagamentos (${formatarCentavos(calculo.somaPagamentosCentavos)}) deve ser igual ao total do atendimento (${formatarCentavos(calculo.totalCentavos)}).`,
        path: ["pagamentos"],
      });
    }
  });

export type RegistrarAtendimentoRapidoValues = z.infer<typeof registrarAtendimentoRapidoSchema>;
