import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  betaCreate: vi.fn(),
  create: vi.fn(),
  opcoes: [] as unknown[],
}));

vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const original = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class AnthropicMock {
    static AuthenticationError = original.default.AuthenticationError;
    static PermissionDeniedError = original.default.PermissionDeniedError;
    static RateLimitError = original.default.RateLimitError;
    static BadRequestError = original.default.BadRequestError;
    static NotFoundError = original.default.NotFoundError;
    static APIConnectionError = original.default.APIConnectionError;
    static InternalServerError = original.default.InternalServerError;
    static APIError = original.default.APIError;
    beta = { messages: { create: sdk.betaCreate } };
    messages = { create: sdk.create };
    constructor(opcoes: unknown) {
      sdk.opcoes.push(opcoes);
    }
  }
  return { ...original, default: AnthropicMock };
});

import Anthropic from "@anthropic-ai/sdk";
import { ErroInsightsIA, gerarAnaliseInsights, interpretarRespostaAnalise, testarChaveClaude } from "./insights-ia";
import type { PayloadInsights } from "./insights-service";

const ANALISE = {
  resumoExecutivo: "Receita cresceu 50%.",
  destaques: [{ titulo: "Receita", detalhe: "R$ 1.500,00 contra R$ 1.000,00." }],
  alertas: [{ titulo: "OS atrasadas", detalhe: "5 OS atrasadas.", severidade: "alta" }],
  oportunidades: [],
  recomendacoes: [{ titulo: "Cobrar saldos", detalhe: "Contatar clientes.", prioridade: "alta" }],
};

const PAYLOAD = {
  periodo: { inicio: "2026-10-01", fim: "2026-10-31", dias: 31 },
  periodoAnterior: { inicio: "2026-08-31", fim: "2026-09-30" },
} as PayloadInsights;

function resposta(parcial: Record<string, unknown> = {}) {
  return {
    model: "claude-haiku-5-5",
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify(ANALISE) }],
    usage: { input_tokens: 1200, output_tokens: 600 },
    ...parcial,
  };
}

function erroApi(status: number) {
  return Anthropic.APIError.generate(status, { error: { message: "falha" } }, "falha", new Headers());
}

describe("insights-ia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.opcoes.length = 0;
  });

  it("usa o modelo econômico sem fallback e devolve análise e uso", async () => {
    sdk.betaCreate.mockResolvedValue(resposta());

    const resultado = await gerarAnaliseInsights("sk-ant-chave", "economico", PAYLOAD);

    expect(resultado).toEqual({ analise: ANALISE, modelo: "claude-haiku-5-5", tokensEntrada: 1200, tokensSaida: 600 });
    expect(sdk.opcoes[0]).toMatchObject({ apiKey: "sk-ant-chave", maxRetries: 1 });
    const params = sdk.betaCreate.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params).not.toHaveProperty("thinking");
    expect(params).not.toHaveProperty("fallbacks");
    expect(params.messages[0].content).toContain("2026-10-01 a 2026-10-31");
  });

  it("usa o modelo inteligente com fallback de recusa no servidor", async () => {
    sdk.betaCreate.mockResolvedValue(resposta({ model: "claude-opus-5-5" }));

    await gerarAnaliseInsights("sk-ant-chave", "inteligente", PAYLOAD);

    const params = sdk.betaCreate.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.fallbacks).toBe("default");
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
  });

  it.each([
    [401, "CHAVE_INVALIDA"],
    [403, "CHAVE_INVALIDA"],
    [429, "LIMITE_EXCEDIDO"],
    [400, "REQUISICAO_RECUSADA"],
    [500, "INDISPONIVEL"],
  ])("traduz erro HTTP %i da API para %s", async (status, codigo) => {
    sdk.betaCreate.mockRejectedValue(erroApi(status));

    await expect(gerarAnaliseInsights("sk-ant-chave", "economico", PAYLOAD)).rejects.toMatchObject({ codigo });
  });

  it("traduz falha de conexão para INDISPONIVEL", async () => {
    sdk.betaCreate.mockRejectedValue(new Anthropic.APIConnectionError({ message: "timeout" }));

    await expect(gerarAnaliseInsights("sk-ant-chave", "economico", PAYLOAD)).rejects.toMatchObject({
      codigo: "INDISPONIVEL",
    });
  });

  it("trata recusa, truncamento e ausência de texto", async () => {
    sdk.betaCreate.mockResolvedValueOnce(resposta({ stop_reason: "refusal" }));
    await expect(gerarAnaliseInsights("k", "economico", PAYLOAD)).rejects.toMatchObject({ codigo: "REQUISICAO_RECUSADA" });

    sdk.betaCreate.mockResolvedValueOnce(resposta({ stop_reason: "max_tokens" }));
    await expect(gerarAnaliseInsights("k", "economico", PAYLOAD)).rejects.toMatchObject({ codigo: "RESPOSTA_INVALIDA" });

    sdk.betaCreate.mockResolvedValueOnce(resposta({ content: [{ type: "thinking", thinking: "" }] }));
    await expect(gerarAnaliseInsights("k", "economico", PAYLOAD)).rejects.toMatchObject({ codigo: "RESPOSTA_INVALIDA" });
  });

  it("rejeita JSON inválido ou fora do schema", () => {
    expect(() => interpretarRespostaAnalise("não é json")).toThrow(ErroInsightsIA);
    expect(() => interpretarRespostaAnalise(JSON.stringify({ ...ANALISE, alertas: [{ titulo: "x" }] }))).toThrow(
      ErroInsightsIA,
    );
    expect(interpretarRespostaAnalise(JSON.stringify(ANALISE))).toEqual(ANALISE);
  });

  it("testa a chave com chamada mínima ao modelo econômico", async () => {
    sdk.create.mockResolvedValue(resposta());
    await testarChaveClaude("sk-ant-chave");
    expect(sdk.create.mock.calls[0][0]).toMatchObject({ model: "claude-haiku-5-5", max_tokens: 16 });

    sdk.create.mockRejectedValue(erroApi(401));
    await expect(testarChaveClaude("sk-ant-chave")).rejects.toMatchObject({ codigo: "CHAVE_INVALIDA" });
  });
});
