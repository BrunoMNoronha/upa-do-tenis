import type Anthropic from "@anthropic-ai/sdk";
import { DEFINICOES_FERRAMENTAS, executarFerramenta } from "@/lib/assistente-ferramentas";
import { montarPromptSistema, type PersonaAssistente } from "@/lib/assistente-personas";
import { ErroInsightsIA, criarCliente, traduzirErroApi } from "@/lib/insights-ia";
import { MODELOS_INSIGHTS, type OpcaoModeloInsights } from "@/lib/insights-schema";

type MensagemApi = Anthropic.Beta.BetaMessageParam;

export interface MensagemGerada {
  papel: "user" | "assistant";
  /** Content blocks exatamente como enviados/recebidos. */
  conteudo: MensagemApi["content"];
  modelo: string | null;
  tokensEntrada: number;
  tokensSaida: number;
}

export interface ResultadoConversa {
  /** Mensagens a acrescentar ao histórico, na ordem: pergunta, rodadas de ferramenta e resposta final. */
  mensagens: MensagemGerada[];
  resposta: string;
}

const MAX_TOKENS = 8000;
/** Rodadas de chamada à API por pergunta (cada rodada pode executar várias ferramentas). */
const MAX_RODADAS = 6;

export function extrairTexto(conteudo: MensagemApi["content"]): string {
  if (typeof conteudo === "string") return conteudo;
  return conteudo
    .filter((bloco): bloco is Anthropic.Beta.BetaTextBlockParam => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("\n\n")
    .trim();
}

/**
 * Responde uma pergunta dentro de uma conversa. O histórico é reenviado sem
 * edição (os modelos 5.5 validam os blocos de raciocínio contra o prefixo da
 * conversa), e o prompt de sistema e as ferramentas são fixos por persona.
 */
export async function responderPergunta(params: {
  apiKey: string;
  persona: PersonaAssistente;
  opcaoModelo: OpcaoModeloInsights;
  historico: MensagemApi[];
  pergunta: string;
}): Promise<ResultadoConversa> {
  const modelo = MODELOS_INSIGHTS[params.opcaoModelo];
  const comFallback = params.opcaoModelo === "inteligente";
  const cliente = criarCliente(params.apiKey);

  const novas: MensagemGerada[] = [
    { papel: "user", conteudo: [{ type: "text", text: params.pergunta }], modelo: null, tokensEntrada: 0, tokensSaida: 0 },
  ];

  for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
    let resposta: Anthropic.Beta.BetaMessage;
    try {
      resposta = await cliente.beta.messages.create({
        model: modelo,
        max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: montarPromptSistema(params.persona), cache_control: { type: "ephemeral" } }],
        tools: DEFINICOES_FERRAMENTAS,
        messages: [...params.historico, ...novas.map((m) => ({ role: m.papel, content: m.conteudo }))],
        ...(comFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
    } catch (error) {
      traduzirErroApi(error);
    }

    novas.push({
      papel: "assistant",
      conteudo: resposta.content as MensagemApi["content"],
      modelo: resposta.model,
      tokensEntrada: resposta.usage.input_tokens,
      tokensSaida: resposta.usage.output_tokens,
    });

    if (resposta.stop_reason === "refusal") {
      throw new ErroInsightsIA("REQUISICAO_RECUSADA", "O assistente recusou responder. Reformule a pergunta.");
    }
    if (resposta.stop_reason === "max_tokens") {
      throw new ErroInsightsIA("RESPOSTA_INVALIDA", "A resposta excedeu o tamanho máximo. Tente uma pergunta mais específica.");
    }

    const chamadas = resposta.content.filter(
      (bloco): bloco is Anthropic.Beta.BetaToolUseBlock => bloco.type === "tool_use",
    );

    if (resposta.stop_reason === "tool_use" && chamadas.length > 0) {
      const resultados = await Promise.all(
        chamadas.map(async (chamada): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
          const { conteudo, erro } = await executarFerramenta(chamada.name, chamada.input);
          return { type: "tool_result", tool_use_id: chamada.id, content: conteudo, ...(erro ? { is_error: true } : {}) };
        }),
      );
      novas.push({ papel: "user", conteudo: resultados, modelo: null, tokensEntrada: 0, tokensSaida: 0 });
      continue;
    }

    const texto = extrairTexto(resposta.content as MensagemApi["content"]);
    if (!texto) {
      throw new ErroInsightsIA("RESPOSTA_INVALIDA", "O assistente não devolveu uma resposta. Tente novamente.");
    }
    return { mensagens: novas, resposta: texto };
  }

  throw new ErroInsightsIA(
    "RESPOSTA_INVALIDA",
    "A pergunta exigiu consultas demais. Tente dividir em perguntas mais específicas.",
  );
}
