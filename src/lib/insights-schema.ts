import { z } from "zod";

export const MODELOS_INSIGHTS = {
  economico: "claude-haiku-5-5",
  inteligente: "claude-opus-5-5",
} as const;

export type OpcaoModeloInsights = keyof typeof MODELOS_INSIGHTS;

/** Preço por milhão de tokens (US$), para estimar o custo exibido na tela. */
export const PRECO_MODELOS_USD_POR_MTOK: Record<string, { entrada: number; saida: number }> = {
  [MODELOS_INSIGHTS.economico]: { entrada: 0.1, saida: 0.5 },
  [MODELOS_INSIGHTS.inteligente]: { entrada: 4, saida: 20 },
};

export const ROTULO_MODELOS: Record<string, string> = {
  [MODELOS_INSIGHTS.economico]: "Econômico (Claude Haiku 5.5)",
  [MODELOS_INSIGHTS.inteligente]: "Inteligente (Claude Opus 5.5)",
};

export function estimarCustoUsd(modelo: string, tokensEntrada: number, tokensSaida: number): number | null {
  const preco = PRECO_MODELOS_USD_POR_MTOK[modelo];
  if (!preco) return null;
  return (tokensEntrada * preco.entrada + tokensSaida * preco.saida) / 1_000_000;
}

/** Período máximo de uma análise; mantém o payload e o tempo de resposta sob controle. */
export const LIMITE_DIAS_PERIODO_INSIGHTS = 366;

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function diaValido(valor: string): boolean {
  if (!DIA.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function contarDiasPeriodo(inicio: string, fim: string): number {
  const [a1, m1, d1] = inicio.split("-").map(Number);
  const [a2, m2, d2] = fim.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000) + 1;
}

export const gerarInsightsRequestSchema = z
  .object({
    inicio: z.string().refine(diaValido, "Data inicial inválida."),
    fim: z.string().refine(diaValido, "Data final inválida."),
    modelo: z.enum(["economico", "inteligente"], {
      errorMap: () => ({ message: "Selecione o modelo econômico ou inteligente." }),
    }),
  })
  .refine((dados) => dados.inicio <= dados.fim, {
    message: "A data inicial deve ser anterior ou igual à data final.",
    path: ["fim"],
  })
  .refine((dados) => contarDiasPeriodo(dados.inicio, dados.fim) <= LIMITE_DIAS_PERIODO_INSIGHTS, {
    message: `O período pode ter no máximo ${LIMITE_DIAS_PERIODO_INSIGHTS} dias.`,
    path: ["fim"],
  });

export type GerarInsightsRequest = z.infer<typeof gerarInsightsRequestSchema>;

const nivel = z.enum(["alta", "media", "baixa"]);
const texto = z.string().trim().min(1);
const ponto = z.object({ titulo: texto, detalhe: texto });

export const analiseInsightsSchema = z.object({
  resumoExecutivo: texto,
  destaques: z.array(ponto),
  alertas: z.array(ponto.extend({ severidade: nivel })),
  oportunidades: z.array(ponto),
  recomendacoes: z.array(ponto.extend({ prioridade: nivel })),
});

export type AnaliseInsights = z.infer<typeof analiseInsightsSchema>;
export type NivelInsight = z.infer<typeof nivel>;

const pontoJsonSchema = {
  type: "object",
  properties: { titulo: { type: "string" }, detalhe: { type: "string" } },
  required: ["titulo", "detalhe"],
  additionalProperties: false,
} as const;

function pontoComNivel(campo: "severidade" | "prioridade") {
  return {
    type: "object",
    properties: {
      ...pontoJsonSchema.properties,
      [campo]: { type: "string", enum: ["alta", "media", "baixa"] },
    },
    required: ["titulo", "detalhe", campo],
    additionalProperties: false,
  };
}

/** JSON Schema enviado em `output_config.format`; espelha `analiseInsightsSchema`. */
export const ANALISE_INSIGHTS_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    resumoExecutivo: { type: "string" },
    destaques: { type: "array", items: pontoJsonSchema },
    alertas: { type: "array", items: pontoComNivel("severidade") },
    oportunidades: { type: "array", items: pontoJsonSchema },
    recomendacoes: { type: "array", items: pontoComNivel("prioridade") },
  },
  required: ["resumoExecutivo", "destaques", "alertas", "oportunidades", "recomendacoes"],
  additionalProperties: false,
};
