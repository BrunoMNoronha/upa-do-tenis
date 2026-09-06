import { z } from "zod";
import { dataOperacionalHoje } from "./date-range";
import { sanitizeCurrency } from "./sanitizers";

const FORMATO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const JUSTIFICATIVA_MINIMA = 10;

const safeNumber = (minMessage: string) => z.preprocess((val) => {
  return sanitizeCurrency(val as any);
}, z.number().min(0, minMessage));

export const ordemServicoServicoSchema = z.object({
  servicoId: z.string().min(1, "O serviço é obrigatório."),
  valor: safeNumber("O valor do serviço não pode ser negativo."),
});

export const ordemServicoFormSchema = z.object({
  clienteId: z.string().min(1, "O cliente é obrigatório."),
  numeroSufixo: z.string().regex(/^[0-9]{4}$/, "O sufixo deve ter exatamente 4 dígitos numéricos."),
  itemRecebido: z.string().min(2, "A descrição do item é obrigatória."),
  servicoId: z.string().optional(),
  servicos: z.array(ordemServicoServicoSchema).optional().default([]),
  dataEntrada: z.string().optional(),
  justificativaDataEntrada: z.string().optional(),
  prazoPrevisto: z.string().min(1, "A data de previsão é obrigatória."),
  valorEstimado: safeNumber("O valor não pode ser negativo."),
  observacoes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.servicos.length === 0 && !data.servicoId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["servicos"],
      message: "Informe pelo menos um serviço.",
    });
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

export const ordemServicoServicosAtualizarSchema = z.object({
  itemOrdemServicoId: z.string().min(1, "O item da OS é obrigatório."),
  servicos: z.array(ordemServicoServicoSchema).min(1, "A OS deve possuir pelo menos um serviço."),
});

export const statusUpdateSchema = z.object({
  statusNovo: z.enum(["EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE"], {
    errorMap: () => ({ message: "Status inválido." }),
  }),
  observacao: z.string().optional(),
});

export type StatusUpdateValues = z.infer<typeof statusUpdateSchema>;

export const ordemServicoIdParamsSchema = z.object({
  id: z.string().min(1, "ID da Ordem de Serviço é obrigatório."),
});
