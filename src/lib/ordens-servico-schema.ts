import { z } from "zod";
import { dataOperacionalHoje } from "./date-range";
import { sanitizeCurrency } from "./sanitizers";
import { FORMATO_NUMERO_OS } from "./ordens-servico-numero";
import { LIMITE_ITENS_POR_OS, TIPO_ITEM_PADRAO } from "./ordens-servico-itens";

const FORMATO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const JUSTIFICATIVA_MINIMA = 10;

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  return sanitizeCurrency(val as any);
}, z.number().min(0, minMessage));

export const ordemServicoServicoSchema = z.object({
  servicoId: z.string().min(1, "O serviço é obrigatório."),
  valor: safeNumber("O valor do serviço não pode ser negativo."),
});

// Um item recebido da OS (issue #205). Serviços são opcionais: o item pode
// ser detalhado depois. O mesmo serviço não pode repetir dentro do item.
export const ordemServicoItemSchema = z.object({
  // Chave gerada no navegador para associar a foto ao item depois da criação.
  clientKey: z.string().trim().max(64).optional(),
  tipoItem: z.string().trim().min(1).optional().default(TIPO_ITEM_PADRAO),
  descricao: z.string().trim().min(2, "A descrição do item é obrigatória."),
  observacoes: z.string().optional(),
  servicos: z.array(ordemServicoServicoSchema).optional().default([]),
}).superRefine((item, ctx) => {
  const ids = item.servicos.map((servico) => servico.servicoId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["servicos"],
      message: "O mesmo serviço não pode ser adicionado duas vezes ao mesmo item.",
    });
  }
});

export const ordemServicoFormSchema = z.object({
  clienteId: z.string().min(1, "O cliente é obrigatório."),
  // Contrato novo: um ou mais itens, cada um com a própria lista de serviços.
  itens: z
    .array(ordemServicoItemSchema)
    .max(LIMITE_ITENS_POR_OS, `Uma OS aceita no máximo ${LIMITE_ITENS_POR_OS} itens.`)
    .optional()
    .default([]),
  // Contrato antigo (um item + lista única de serviços), mantido enquanto
  // houver navegadores com o JavaScript anterior em cache.
  itemRecebido: z.string().optional(),
  servicoId: z.string().optional(),
  servicos: z.array(ordemServicoServicoSchema).optional().default([]),
  dataEntrada: z.string().optional(),
  // Número informado pelo operador; compõe OS-<DDMMAAAA>-<numeroOS>.
  // Mantido como string para preservar zeros à esquerda (ex.: "0124").
  numeroOS: z
    .string({ required_error: "O número da OS é obrigatório." })
    .trim()
    .min(1, "O número da OS é obrigatório.")
    .regex(FORMATO_NUMERO_OS, "O número da OS deve conter apenas dígitos."),
  justificativaDataEntrada: z.string().optional(),
  prazoPrevisto: z.string().min(1, "A data de previsão é obrigatória."),
  valorEstimado: safeNumber("O valor não pode ser negativo.").optional().default(0),
  observacoes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Sem `itens[]` o payload segue o contrato antigo: exige o item único e
  // aplica nele a mesma regra de serviço repetido.
  if (data.itens.length === 0) {
    if ((data.itemRecebido?.trim().length ?? 0) < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itens"],
        message: "Informe pelo menos um item recebido.",
      });
    }
    const ids = data.servicos.map((servico) => servico.servicoId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["servicos"],
        message: "O mesmo serviço não pode ser adicionado duas vezes ao mesmo item.",
      });
    }
  }

  // A data operacional é comparada como string "YYYY-MM-DD" para que a regra
  // não dependa do fuso do processo, que difere entre navegador e servidor.
  // Ver dataOperacionalHoje em date-range.ts.
  const dataInformada = data.dataEntrada?.trim() ?? "";

  if (dataInformada === "") {
    return;
  }

  if (!FORMATO_DATA_ISO.test(dataInformada)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dataEntrada"],
      message: "Informe a data de entrada no formato AAAA-MM-DD.",
    });
    return;
  }

  const [ano, mes, dia] = dataInformada.split("-").map(Number);
  const calendario = new Date(ano, mes - 1, dia);

  if (
    calendario.getFullYear() !== ano ||
    calendario.getMonth() !== mes - 1 ||
    calendario.getDate() !== dia
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dataEntrada"],
      message: "A data de entrada informada não existe no calendário.",
    });
    return;
  }

  const hoje = dataOperacionalHoje();

  if (dataInformada > hoje) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dataEntrada"],
      message: "A data de entrada não pode ser futura.",
    });
    return;
  }

  if (
    dataInformada !== hoje &&
    (data.justificativaDataEntrada?.trim().length ?? 0) < JUSTIFICATIVA_MINIMA
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["justificativaDataEntrada"],
      message: "Justifique o registro com data retroativa (mínimo 10 caracteres).",
    });
  }
});

export type OrdemServicoFormValues = z.infer<typeof ordemServicoFormSchema>;
export type OrdemServicoServicoValues = z.infer<typeof ordemServicoServicoSchema>;
export type OrdemServicoItemValues = z.infer<typeof ordemServicoItemSchema>;

export const ordemServicoServicosAtualizarSchema = z.object({
  itemOrdemServicoId: z.string().min(1, "O item da OS é obrigatório."),
  servicos: z.array(ordemServicoServicoSchema).min(1, "A OS deve possuir pelo menos um serviço."),
});

export const statusUpdateSchema = z.object({
  statusNovo: z.enum(["EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE", "CANCELADA"], {
    errorMap: () => ({ message: "Status inválido." }),
  }),
  observacao: z.string().optional(),
});

export type StatusUpdateValues = z.infer<typeof statusUpdateSchema>;

export const ordemServicoIdParamsSchema = z.object({
  id: z.string().min(1, "ID da Ordem de Serviço é obrigatório."),
});

export const ordemServicoFavoritaSchema = z.object({
  favorita: z.boolean({ required_error: "Informe se a OS deve ser favorita." }),
});

export type OrdemServicoFavoritaValues = z.infer<typeof ordemServicoFavoritaSchema>;
