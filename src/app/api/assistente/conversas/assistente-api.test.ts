import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: vi.fn(), obterUsuarioSessaoDaRequest: vi.fn() }));
vi.mock("@/lib/insights-config", () => ({ obterChaveClaude: vi.fn() }));
vi.mock("@/lib/assistente-ia", () => ({ responderPergunta: vi.fn() }));
vi.mock("@/lib/assistente-conversas", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/assistente-conversas")>();
  return {
    LIMITE_PERGUNTAS_POR_CONVERSA: original.LIMITE_PERGUNTAS_POR_CONVERSA,
    listarConversas: vi.fn(),
    obterConversaCompleta: vi.fn(),
    criarConversaComMensagens: vi.fn(),
    acrescentarMensagens: vi.fn(),
    excluirConversa: vi.fn(),
  };
});

import { exigirSessaoApi, obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { obterChaveClaude } from "@/lib/insights-config";
import { responderPergunta } from "@/lib/assistente-ia";
import {
  acrescentarMensagens,
  criarConversaComMensagens,
  excluirConversa,
  listarConversas,
  obterConversaCompleta,
} from "@/lib/assistente-conversas";
import { ErroInsightsIA } from "@/lib/insights-ia";
import { GET as LISTAR, POST as CRIAR } from "./route";
import { DELETE as EXCLUIR, GET as OBTER } from "./[id]/route";
import { POST as PERGUNTAR } from "./[id]/mensagens/route";

const USUARIO = { id: "u1", nome: "Operador", email: "op@upa.com", ativo: true };
const MENSAGENS = [{ papel: "user", conteudo: [], modelo: null, tokensEntrada: 0, tokensSaida: 0 }];
const RESUMO = { id: "c1", titulo: "Oi", persona: "FINANCAS" as const, atualizadoEm: "2026-10-18T00:00:00.000Z" };
const params = (id = "c1") => ({ params: Promise.resolve({ id }) });

function req(method: string, body?: unknown, url = "http://localhost/api/assistente/conversas") {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function conversaCompleta(perguntas = 1) {
  return { resumo: RESUMO, historico: [{ role: "user" as const, content: "x" }], perguntas, visiveis: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(exigirSessaoApi).mockResolvedValue(null);
  vi.mocked(obterUsuarioSessaoDaRequest).mockResolvedValue(USUARIO);
  vi.mocked(obterChaveClaude).mockResolvedValue("sk-ant-chave");
  vi.mocked(responderPergunta).mockResolvedValue({ mensagens: MENSAGENS as never, resposta: "Resposta" });
  vi.mocked(criarConversaComMensagens).mockResolvedValue(RESUMO);
  vi.mocked(obterConversaCompleta).mockResolvedValue(conversaCompleta());
});

describe("autenticação", () => {
  it("responde 401 sem sessão em todas as rotas", async () => {
    vi.mocked(exigirSessaoApi).mockResolvedValue(new NextResponse(null, { status: 401 }) as any);

    expect((await LISTAR(req("GET"))).status).toBe(401);
    expect((await CRIAR(req("POST", {}))).status).toBe(401);
    expect((await OBTER(req("GET"), params())).status).toBe(401);
    expect((await EXCLUIR(req("DELETE"), params())).status).toBe(401);
    expect((await PERGUNTAR(req("POST", {}), params())).status).toBe(401);
    expect(responderPergunta).not.toHaveBeenCalled();
  });
});

describe("POST /api/assistente/conversas", () => {
  const corpo = { persona: "FINANCAS", modelo: "economico", pergunta: "Como foi o mês?" };

  it("cria a conversa com as mensagens geradas", async () => {
    const res = await CRIAR(req("POST", corpo));

    expect(res.status).toBe(200);
    expect(responderPergunta).toHaveBeenCalledWith({
      apiKey: "sk-ant-chave",
      persona: "FINANCAS",
      opcaoModelo: "economico",
      historico: [],
      pergunta: "Como foi o mês?",
    });
    expect(criarConversaComMensagens).toHaveBeenCalledWith({
      usuarioId: "u1",
      persona: "FINANCAS",
      pergunta: "Como foi o mês?",
      mensagens: MENSAGENS,
    });
    expect(await res.json()).toEqual({ conversa: RESUMO, resposta: "Resposta" });
  });

  it.each([
    [{ ...corpo, persona: "JURIDICO" }],
    [{ ...corpo, modelo: "turbo" }],
    [{ ...corpo, pergunta: "   " }],
    [{ ...corpo, pergunta: "x".repeat(2001) }],
  ])("valida o corpo %#", async (body) => {
    expect((await CRIAR(req("POST", body))).status).toBe(400);
    expect(responderPergunta).not.toHaveBeenCalled();
  });

  it("responde 409 sem chave e não salva nada quando a IA falha", async () => {
    vi.mocked(obterChaveClaude).mockResolvedValueOnce(null);
    expect((await CRIAR(req("POST", corpo))).status).toBe(409);

    vi.mocked(responderPergunta).mockRejectedValueOnce(new ErroInsightsIA("LIMITE_EXCEDIDO", "limite"));
    const res = await CRIAR(req("POST", corpo));
    expect(res.status).toBe(429);
    expect(criarConversaComMensagens).not.toHaveBeenCalled();
  });
});

describe("POST /api/assistente/conversas/[id]/mensagens", () => {
  const corpo = { modelo: "inteligente", pergunta: "E o anterior?" };

  it("continua a conversa com a persona dela e acrescenta após o histórico lido", async () => {
    const res = await PERGUNTAR(req("POST", corpo), params());

    expect(res.status).toBe(200);
    expect(obterConversaCompleta).toHaveBeenCalledWith("c1", "u1");
    expect(responderPergunta).toHaveBeenCalledWith(
      expect.objectContaining({ persona: "FINANCAS", opcaoModelo: "inteligente", historico: [{ role: "user", content: "x" }] }),
    );
    expect(acrescentarMensagens).toHaveBeenCalledWith("c1", 1, MENSAGENS);
  });

  it("responde 404 para conversa de outro usuário ou inexistente", async () => {
    vi.mocked(obterConversaCompleta).mockResolvedValueOnce(null);
    expect((await PERGUNTAR(req("POST", corpo), params("x"))).status).toBe(404);
    expect(responderPergunta).not.toHaveBeenCalled();
  });

  it("bloqueia ao atingir o limite de perguntas", async () => {
    vi.mocked(obterConversaCompleta).mockResolvedValueOnce(conversaCompleta(30));
    const res = await PERGUNTAR(req("POST", corpo), params());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ codigo: "LIMITE_CONVERSA" });
  });

  it("não grava quando a IA falha e trata gravação concorrente", async () => {
    vi.mocked(responderPergunta).mockRejectedValueOnce(new ErroInsightsIA("CHAVE_INVALIDA", "chave"));
    expect((await PERGUNTAR(req("POST", corpo), params())).status).toBe(502);
    expect(acrescentarMensagens).not.toHaveBeenCalled();

    vi.mocked(acrescentarMensagens).mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }));
    const conflito = await PERGUNTAR(req("POST", corpo), params());
    expect(conflito.status).toBe(409);
    expect(await conflito.json()).toMatchObject({ codigo: "CONFLITO" });
  });
});

describe("GET/DELETE /api/assistente/conversas[/id]", () => {
  it("lista só as conversas do usuário", async () => {
    vi.mocked(listarConversas).mockResolvedValue({ itens: [], total: 0, pagina: 1, porPagina: 20 });
    expect((await LISTAR(req("GET", undefined, "http://localhost/api/assistente/conversas?pagina=-1"))).status).toBe(200);
    expect(listarConversas).toHaveBeenCalledWith("u1", 1);
  });

  it("abre, sinaliza limite e exclui", async () => {
    vi.mocked(obterConversaCompleta).mockResolvedValueOnce(conversaCompleta(30));
    const aberta = await OBTER(req("GET"), params());
    expect(await aberta.json()).toMatchObject({ conversa: RESUMO, mensagens: [], limiteAtingido: true });

    vi.mocked(obterConversaCompleta).mockResolvedValueOnce(null);
    expect((await OBTER(req("GET"), params("x"))).status).toBe(404);

    vi.mocked(excluirConversa).mockResolvedValueOnce(true);
    expect((await EXCLUIR(req("DELETE"), params())).status).toBe(200);
    expect(excluirConversa).toHaveBeenCalledWith("c1", "u1");

    vi.mocked(excluirConversa).mockResolvedValueOnce(false);
    expect((await EXCLUIR(req("DELETE"), params("x"))).status).toBe(404);
  });
});
