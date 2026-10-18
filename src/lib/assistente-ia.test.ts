import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ create: vi.fn() }));

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
    beta = { messages: { create: sdk.create } };
  }
  return { ...original, default: AnthropicMock };
});
vi.mock("@/lib/assistente-ferramentas", () => ({
  DEFINICOES_FERRAMENTAS: [{ name: "consultar_situacao_atual" }],
  executarFerramenta: vi.fn(),
}));

import Anthropic from "@anthropic-ai/sdk";
import { executarFerramenta } from "@/lib/assistente-ferramentas";
import { montarPromptSistema } from "./assistente-personas";
import { responderPergunta } from "./assistente-ia";

const HISTORICO = [
  { role: "user" as const, content: [{ type: "text" as const, text: "Pergunta antiga" }] },
  {
    role: "assistant" as const,
    content: [
      { type: "thinking" as const, thinking: "", signature: "assinatura" },
      { type: "text" as const, text: "Resposta antiga" },
    ],
  },
];

function resposta(conteudo: unknown[], stop_reason = "end_turn", model = "claude-haiku-5-5") {
  return { model, stop_reason, content: conteudo, usage: { input_tokens: 100, output_tokens: 20 } };
}

describe("responderPergunta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executa ferramentas, reenvia o histórico sem edição e devolve todas as mensagens geradas", async () => {
    const chamada = { type: "tool_use", id: "t1", name: "consultar_situacao_atual", input: {} };
    sdk.create
      .mockResolvedValueOnce(resposta([{ type: "thinking", thinking: "", signature: "s1" }, chamada], "tool_use"))
      .mockResolvedValueOnce(resposta([{ type: "text", text: "Há 3 OS aguardando retirada." }]));
    vi.mocked(executarFerramenta).mockResolvedValue({ conteudo: '{"osAguardandoRetirada":3}', erro: false });

    const resultado = await responderPergunta({
      apiKey: "sk-ant-x",
      persona: "OPERACOES",
      opcaoModelo: "economico",
      historico: HISTORICO,
      pergunta: "Quantas OS aguardam retirada?",
    });

    expect(resultado.resposta).toBe("Há 3 OS aguardando retirada.");
    expect(resultado.mensagens.map((m) => m.papel)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(resultado.mensagens[2].conteudo).toEqual([
      { type: "tool_result", tool_use_id: "t1", content: '{"osAguardandoRetirada":3}' },
    ]);
    expect(resultado.mensagens[1]).toMatchObject({ modelo: "claude-haiku-5-5", tokensEntrada: 100, tokensSaida: 20 });

    const segunda = sdk.create.mock.calls[1][0];
    expect(segunda.messages.slice(0, 2)).toEqual(HISTORICO);
    expect(segunda.messages).toHaveLength(5);
    expect(segunda.messages[3].content[0]).toEqual({ type: "thinking", thinking: "", signature: "s1" });
    expect(segunda.system[0].text).toBe(montarPromptSistema("OPERACOES"));
    expect(segunda.system[0].text).toBe(sdk.create.mock.calls[0][0].system[0].text);
    expect(segunda).not.toHaveProperty("fallbacks");
  });

  it("marca erro de ferramenta como is_error e usa fallback no modelo inteligente", async () => {
    sdk.create
      .mockResolvedValueOnce(resposta([{ type: "tool_use", id: "t1", name: "x", input: {} }], "tool_use", "claude-opus-5-5"))
      .mockResolvedValueOnce(resposta([{ type: "text", text: "ok" }], "end_turn", "claude-opus-5-5"));
    vi.mocked(executarFerramenta).mockResolvedValue({ conteudo: "Parâmetros inválidos", erro: true });

    const resultado = await responderPergunta({
      apiKey: "k",
      persona: "FINANCAS",
      opcaoModelo: "inteligente",
      historico: [],
      pergunta: "?",
    });

    expect(resultado.mensagens[2].conteudo).toEqual([
      { type: "tool_result", tool_use_id: "t1", content: "Parâmetros inválidos", is_error: true },
    ]);
    expect(sdk.create.mock.calls[0][0]).toMatchObject({
      model: "claude-opus-5-5",
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
    });
  });

  it("interrompe após o limite de rodadas", async () => {
    sdk.create.mockResolvedValue(resposta([{ type: "tool_use", id: "t", name: "x", input: {} }], "tool_use"));
    vi.mocked(executarFerramenta).mockResolvedValue({ conteudo: "{}", erro: false });

    await expect(
      responderPergunta({ apiKey: "k", persona: "RH", opcaoModelo: "economico", historico: [], pergunta: "?" }),
    ).rejects.toMatchObject({ codigo: "RESPOSTA_INVALIDA" });
    expect(sdk.create).toHaveBeenCalledTimes(6);
  });

  it("trata recusa, truncamento e erros da API", async () => {
    const base = { apiKey: "k", persona: "RH" as const, opcaoModelo: "economico" as const, historico: [], pergunta: "?" };

    sdk.create.mockResolvedValueOnce(resposta([], "refusal"));
    await expect(responderPergunta(base)).rejects.toMatchObject({ codigo: "REQUISICAO_RECUSADA" });

    sdk.create.mockResolvedValueOnce(resposta([{ type: "text", text: "cor" }], "max_tokens"));
    await expect(responderPergunta(base)).rejects.toMatchObject({ codigo: "RESPOSTA_INVALIDA" });

    sdk.create.mockRejectedValueOnce(
      Anthropic.APIError.generate(401, { error: { message: "x" } }, "x", new Headers()),
    );
    await expect(responderPergunta(base)).rejects.toMatchObject({ codigo: "CHAVE_INVALIDA" });
  });
});
