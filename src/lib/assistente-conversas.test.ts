import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  acrescentarMensagens,
  criarConversaComMensagens,
  excluirConversa,
  listarConversas,
  obterConversaCompleta,
} from "./assistente-conversas";
import type { MensagemGerada } from "./assistente-ia";

const PERGUNTA: MensagemGerada = {
  papel: "user",
  conteudo: [{ type: "text", text: "Como está o caixa?" }],
  modelo: null,
  tokensEntrada: 0,
  tokensSaida: 0,
};
const CHAMADA: MensagemGerada = {
  papel: "assistant",
  conteudo: [
    { type: "thinking", thinking: "", signature: "abc" },
    { type: "tool_use", id: "t1", name: "consultar_situacao_atual", input: {} },
  ],
  modelo: "claude-haiku-5-5",
  tokensEntrada: 50,
  tokensSaida: 10,
};
const RESULTADO: MensagemGerada = {
  papel: "user",
  conteudo: [{ type: "tool_result", tool_use_id: "t1", content: "{}" }],
  modelo: null,
  tokensEntrada: 0,
  tokensSaida: 0,
};
const RESPOSTA: MensagemGerada = {
  papel: "assistant",
  conteudo: [{ type: "text", text: "O caixa está aberto." }],
  modelo: "claude-haiku-5-5",
  tokensEntrada: 80,
  tokensSaida: 30,
};

let usuarioA: string;
let usuarioB: string;

async function limpar() {
  await prisma.conversaAssistente.deleteMany({ where: { usuarioId: { in: [usuarioA, usuarioB] } } });
}

describe("assistente-conversas (integração)", () => {
  beforeAll(async () => {
    const sufixo = Date.now();
    usuarioA = (await prisma.usuario.create({ data: { nome: "A", email: `assist-a-${sufixo}@t.local`, senhaHash: "x" } })).id;
    usuarioB = (await prisma.usuario.create({ data: { nome: "B", email: `assist-b-${sufixo}@t.local`, senhaHash: "x" } })).id;
  });

  beforeEach(limpar);

  afterAll(async () => {
    await limpar();
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioA, usuarioB] } } });
  });

  it("grava o histórico completo e reconstrói exatamente os blocos enviados à API", async () => {
    const conversa = await criarConversaComMensagens({
      usuarioId: usuarioA,
      persona: "FINANCAS",
      pergunta: "Como está o caixa?",
      mensagens: [PERGUNTA, CHAMADA, RESULTADO, RESPOSTA],
    });

    const completa = await obterConversaCompleta(conversa.id, usuarioA);

    expect(completa?.resumo).toMatchObject({ titulo: "Como está o caixa?", persona: "FINANCAS" });
    expect(completa?.historico).toEqual([PERGUNTA, CHAMADA, RESULTADO, RESPOSTA].map((m) => ({ role: m.papel, content: m.conteudo })));
    expect(completa?.perguntas).toBe(1);
    expect(completa?.visiveis.map((m) => [m.papel, m.texto])).toEqual([
      ["user", "Como está o caixa?"],
      ["assistant", "O caixa está aberto."],
    ]);
  });

  it("acrescenta mensagens em ordem e rejeita gravação concorrente na mesma posição", async () => {
    const conversa = await criarConversaComMensagens({
      usuarioId: usuarioA,
      persona: "RH",
      pergunta: "x".repeat(120),
      mensagens: [PERGUNTA, RESPOSTA],
    });
    expect(conversa.titulo).toHaveLength(80);

    await acrescentarMensagens(conversa.id, 2, [PERGUNTA, RESPOSTA]);
    const completa = await obterConversaCompleta(conversa.id, usuarioA);
    expect(completa?.historico).toHaveLength(4);
    expect(completa?.perguntas).toBe(2);

    await expect(acrescentarMensagens(conversa.id, 2, [PERGUNTA])).rejects.toMatchObject({ code: "P2002" });
  });

  it("isola as conversas por usuário e exclui em cascata", async () => {
    const conversa = await criarConversaComMensagens({
      usuarioId: usuarioA,
      persona: "MARKETING",
      pergunta: "Oi",
      mensagens: [PERGUNTA, RESPOSTA],
    });

    expect(await obterConversaCompleta(conversa.id, usuarioB)).toBeNull();
    expect((await listarConversas(usuarioB, 1)).total).toBe(0);
    expect((await listarConversas(usuarioA, 1)).itens.map((c) => c.id)).toEqual([conversa.id]);
    expect(await excluirConversa(conversa.id, usuarioB)).toBe(false);

    expect(await excluirConversa(conversa.id, usuarioA)).toBe(true);
    expect(await prisma.mensagemAssistente.count({ where: { conversaId: conversa.id } })).toBe(0);
  });
});
