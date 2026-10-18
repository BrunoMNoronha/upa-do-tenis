import Anthropic from "@anthropic-ai/sdk";
import {
  ANALISE_INSIGHTS_JSON_SCHEMA,
  MODELOS_INSIGHTS,
  analiseInsightsSchema,
  type AnaliseInsights,
  type OpcaoModeloInsights,
} from "@/lib/insights-schema";
import type { PayloadInsights } from "@/lib/insights-service";

export type CodigoErroInsightsIA =
  | "CHAVE_INVALIDA"
  | "LIMITE_EXCEDIDO"
  | "INDISPONIVEL"
  | "REQUISICAO_RECUSADA"
  | "RESPOSTA_INVALIDA";

export const STATUS_HTTP_ERRO_INSIGHTS: Record<CodigoErroInsightsIA, number> = {
  CHAVE_INVALIDA: 502,
  LIMITE_EXCEDIDO: 429,
  INDISPONIVEL: 503,
  REQUISICAO_RECUSADA: 502,
  RESPOSTA_INVALIDA: 422,
};

export class ErroInsightsIA extends Error {
  constructor(
    public readonly codigo: CodigoErroInsightsIA,
    message: string,
  ) {
    super(message);
    this.name = "ErroInsightsIA";
  }
}

export interface ResultadoAnaliseIA {
  analise: AnaliseInsights;
  /** Modelo que efetivamente respondeu (pode diferir em caso de fallback). */
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
}

// A função serverless tem 60s (maxDuration da rota); o cliente desiste antes.
const TIMEOUT_MS = 50_000;
const MAX_TOKENS = 8000;

export const PROMPT_SISTEMA_INSIGHTS = `Você é um consultor de negócios sênior, especialista em pequenos negócios de serviços no Brasil. Você analisa os indicadores de uma sapataria (conserto, reforma e higienização de calçados) que opera com ordens de serviço (OS), atendimentos rápidos (serviço pago na hora) e vendas de produtos no balcão.

Regras da análise:
- Use APENAS os dados do JSON recebido. Não invente números, causas ou fatos externos.
- Compare o período atual com o período anterior sempre que houver dados, citando os valores e a variação percentual calculada a partir dos números fornecidos.
- Valores monetários estão em reais; escreva-os como "R$ 1.234,56".
- Indicadores zerados ou ausentes significam "sem movimento registrado"; não conclua tendência a partir deles.
- "osAtrasadas" e "osAguardandoRetirada" são a situação atual (não dependem do período) e indicam gargalos operacionais.
- Tom profissional, objetivo e acionável, em português do Brasil. Evite generalidades: cada recomendação deve dizer o que fazer, por quê (com base em qual número) e qual resultado esperar.
- Priorize o que mais impacta caixa, recebimento de saldos em aberto, capacidade operacional e reposição de estoque.`;

export function montarPromptUsuario(payload: PayloadInsights): string {
  return `Analise os indicadores do período de ${payload.periodo.inicio} a ${payload.periodo.fim} (${payload.periodo.dias} dias), comparando com o período anterior de ${payload.periodoAnterior.inicio} a ${payload.periodoAnterior.fim}.

Produza:
- resumoExecutivo: visão geral do desempenho em 2 a 4 frases, com os números mais importantes;
- destaques: 2 a 5 pontos positivos ou fatos relevantes, com números;
- alertas: riscos e problemas (financeiro, operacional, estoque, caixa) com severidade "alta", "media" ou "baixa"; lista vazia se não houver;
- oportunidades: 1 a 4 oportunidades de crescimento ou eficiência sustentadas pelos dados;
- recomendacoes: 3 a 6 ações práticas, com prioridade "alta", "media" ou "baixa", da mais para a menos prioritária.

Dados do sistema (JSON):
${JSON.stringify(payload)}`;
}

export function criarCliente(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
}

export function traduzirErroApi(error: unknown): never {
  if (error instanceof ErroInsightsIA) throw error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    throw new ErroInsightsIA("CHAVE_INVALIDA", "A chave da Claude API foi recusada. Verifique a chave em Configurações.");
  }
  if (error instanceof Anthropic.RateLimitError) {
    throw new ErroInsightsIA("LIMITE_EXCEDIDO", "Limite de uso da Claude API atingido. Aguarde alguns instantes e tente novamente.");
  }
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
    throw new ErroInsightsIA(
      "REQUISICAO_RECUSADA",
      `A Claude API recusou a requisição (verifique créditos e acesso ao modelo na conta Anthropic): ${error.message}`,
    );
  }
  if (error instanceof Anthropic.APIConnectionError || error instanceof Anthropic.InternalServerError) {
    throw new ErroInsightsIA("INDISPONIVEL", "A Claude API está indisponível ou demorou demais para responder. Tente novamente.");
  }
  if (error instanceof Anthropic.APIError) {
    throw new ErroInsightsIA("INDISPONIVEL", `Falha na Claude API (status ${error.status ?? "desconhecido"}).`);
  }
  throw error;
}

export function interpretarRespostaAnalise(texto: string): AnaliseInsights {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new ErroInsightsIA("RESPOSTA_INVALIDA", "A IA devolveu uma resposta em formato inesperado. Tente novamente.");
  }

  const resultado = analiseInsightsSchema.safeParse(json);
  if (!resultado.success) {
    throw new ErroInsightsIA("RESPOSTA_INVALIDA", "A IA devolveu uma análise incompleta. Tente novamente.");
  }
  return resultado.data;
}

export async function gerarAnaliseInsights(
  apiKey: string,
  opcaoModelo: OpcaoModeloInsights,
  payload: PayloadInsights,
): Promise<ResultadoAnaliseIA> {
  const modelo = MODELOS_INSIGHTS[opcaoModelo];
  // Fallback de recusa no servidor só existe para o Opus; o Haiku não tem.
  const comFallback = opcaoModelo === "inteligente";

  let resposta: Anthropic.Beta.BetaMessage;
  try {
    resposta = await criarCliente(apiKey).beta.messages.create({
      model: modelo,
      max_tokens: MAX_TOKENS,
      system: PROMPT_SISTEMA_INSIGHTS,
      messages: [{ role: "user", content: montarPromptUsuario(payload) }],
      output_config: { format: { type: "json_schema", schema: ANALISE_INSIGHTS_JSON_SCHEMA } },
      ...(comFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
  } catch (error) {
    traduzirErroApi(error);
  }

  if (resposta.stop_reason === "refusal") {
    throw new ErroInsightsIA("REQUISICAO_RECUSADA", "A IA recusou gerar esta análise. Tente outro período ou modelo.");
  }
  if (resposta.stop_reason === "max_tokens") {
    throw new ErroInsightsIA("RESPOSTA_INVALIDA", "A análise excedeu o tamanho máximo de resposta. Tente um período menor.");
  }

  const texto = resposta.content.find((bloco) => bloco.type === "text");
  if (!texto || texto.type !== "text") {
    throw new ErroInsightsIA("RESPOSTA_INVALIDA", "A IA não devolveu conteúdo de análise. Tente novamente.");
  }

  return {
    analise: interpretarRespostaAnalise(texto.text),
    modelo: resposta.model,
    tokensEntrada: resposta.usage.input_tokens,
    tokensSaida: resposta.usage.output_tokens,
  };
}

/** Chamada mínima (modelo econômico, 16 tokens) para validar a chave salva. */
export async function testarChaveClaude(apiKey: string): Promise<void> {
  try {
    await criarCliente(apiKey).messages.create({
      model: MODELOS_INSIGHTS.economico,
      max_tokens: 16,
      messages: [{ role: "user", content: "Responda apenas: ok" }],
    });
  } catch (error) {
    traduzirErroApi(error);
  }
}
