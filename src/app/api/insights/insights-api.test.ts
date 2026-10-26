import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn(),
  obterUsuarioSessaoDaRequest: vi.fn(),
}));
vi.mock("@/lib/insights-config", () => ({ obterChaveClaude: vi.fn() }));
vi.mock("@/lib/insights-service", () => ({ montarPayloadInsights: vi.fn() }));
vi.mock("@/lib/insights-historico", () => ({
  registrarAnaliseInsight: vi.fn(),
  listarAnalisesInsight: vi.fn(),
  obterAnaliseInsight: vi.fn(),
}));
vi.mock("@/lib/insights-ia", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/insights-ia")>();
  return { ...original, gerarAnaliseInsights: vi.fn() };
});

import { exigirSessaoApi, obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { obterChaveClaude } from "@/lib/insights-config";
import { montarPayloadInsights } from "@/lib/insights-service";
import { listarAnalisesInsight, obterAnaliseInsight, registrarAnaliseInsight } from "@/lib/insights-historico";
import { ErroInsightsIA, gerarAnaliseInsights } from "@/lib/insights-ia";
import { GET, POST } from "./route";
import { GET as GET_POR_ID } from "./[id]/route";

const USUARIO = { id: "u1", nome: "Operador", email: "op@upa.com", ativo: true };
const ANALISE = {
  resumoExecutivo: "Resumo.",
  destaques: [],
  alertas: [],
  oportunidades: [],
  recomendacoes: [],
};
const CORPO_VALIDO = { inicio: "2026-10-01", fim: "2026-10-31", modelo: "economico" };

function criarRequest(method: string, body?: unknown, url = "http://localhost/api/insights") {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("POST /api/insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obterUsuarioSessaoDaRequest).mockResolvedValue(USUARIO);
    vi.mocked(exigirSessaoApi).mockResolvedValue(null);
    vi.mocked(obterChaveClaude).mockResolvedValue("sk-ant-chave");
    vi.mocked(montarPayloadInsights).mockResolvedValue({ periodo: {} } as never);
    vi.mocked(gerarAnaliseInsights).mockResolvedValue({
      analise: ANALISE,
      modelo: "claude-haiku-5-5",
      tokensEntrada: 1000,
      tokensSaida: 500,
    });
    vi.mocked(registrarAnaliseInsight).mockImplementation(async (dados) => ({
      id: "a1",
      modelo: dados.modelo,
      periodoInicio: dados.periodoInicio,
      periodoFim: dados.periodoFim,
      tokensEntrada: dados.tokensEntrada,
      tokensSaida: dados.tokensSaida,
      criadoEm: "2026-10-18T12:00:00.000Z",
      usuarioNome: "Operador",
      analise: dados.analise,
    }));
  });

  it("responde 401 sem sessão", async () => {
    vi.mocked(exigirSessaoApi).mockResolvedValue(NextResponse.json({ message: "Não autenticado." }, { status: 401 }));

    const res = await POST(criarRequest("POST", CORPO_VALIDO));

    expect(res.status).toBe(401);
    expect(gerarAnaliseInsights).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...CORPO_VALIDO, modelo: "turbo" }],
    [{ ...CORPO_VALIDO, inicio: "2026-02-30" }],
    [{ ...CORPO_VALIDO, inicio: "2026-11-01" }],
    [{ ...CORPO_VALIDO, inicio: "2024-01-01" }],
    [{}],
  ])("responde 400 para corpo inválido %#", async (corpo) => {
    const res = await POST(criarRequest("POST", corpo));

    expect(res.status).toBe(400);
    expect(obterChaveClaude).not.toHaveBeenCalled();
  });

  it("responde 409 quando a chave não está configurada", async () => {
    vi.mocked(obterChaveClaude).mockResolvedValue(null);

    const res = await POST(criarRequest("POST", CORPO_VALIDO));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ codigo: "CHAVE_NAO_CONFIGURADA" });
    expect(montarPayloadInsights).not.toHaveBeenCalled();
  });

  it("gera, persiste no histórico e devolve a análise", async () => {
    const res = await POST(criarRequest("POST", CORPO_VALIDO));

    expect(res.status).toBe(200);
    expect(montarPayloadInsights).toHaveBeenCalledWith({ inicio: "2026-10-01", fim: "2026-10-31" });
    expect(gerarAnaliseInsights).toHaveBeenCalledWith("sk-ant-chave", "economico", { periodo: {} });
    expect(registrarAnaliseInsight).toHaveBeenCalledWith({
      modelo: "claude-haiku-5-5",
      periodoInicio: "2026-10-01",
      periodoFim: "2026-10-31",
      tokensEntrada: 1000,
      tokensSaida: 500,
      analise: ANALISE,
      usuarioId: "u1",
    });
    expect(await res.json()).toMatchObject({ id: "a1", salva: true, analise: ANALISE });
  });

  it("devolve a análise mesmo se falhar ao salvar no histórico", async () => {
    vi.mocked(registrarAnaliseInsight).mockRejectedValue(new Error("banco fora"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(criarRequest("POST", CORPO_VALIDO));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: null, salva: false, analise: ANALISE });
  });

  it.each([
    ["CHAVE_INVALIDA", 502],
    ["LIMITE_EXCEDIDO", 429],
    ["INDISPONIVEL", 503],
    ["REQUISICAO_RECUSADA", 502],
    ["RESPOSTA_INVALIDA", 422],
  ] as const)("mapeia %s para HTTP %i sem salvar", async (codigo, status) => {
    vi.mocked(gerarAnaliseInsights).mockRejectedValue(new ErroInsightsIA(codigo, "falha"));

    const res = await POST(criarRequest("POST", CORPO_VALIDO));

    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ message: "falha", codigo });
    expect(registrarAnaliseInsight).not.toHaveBeenCalled();
  });

  it("responde 500 em erro inesperado", async () => {
    vi.mocked(montarPayloadInsights).mockRejectedValue(new Error("banco fora"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await POST(criarRequest("POST", CORPO_VALIDO))).status).toBe(500);
  });
});

describe("GET /api/insights e /api/insights/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exigirSessaoApi).mockResolvedValue(null);
  });

  it("lista o histórico paginado e normaliza página inválida", async () => {
    vi.mocked(listarAnalisesInsight).mockResolvedValue({ itens: [], total: 0, pagina: 1, porPagina: 10 });

    const res = await GET(criarRequest("GET", undefined, "http://localhost/api/insights?pagina=abc"));

    expect(res.status).toBe(200);
    expect(listarAnalisesInsight).toHaveBeenCalledWith(1);

    await GET(criarRequest("GET", undefined, "http://localhost/api/insights?pagina=3"));
    expect(listarAnalisesInsight).toHaveBeenLastCalledWith(3);
  });

  it("exige sessão no histórico", async () => {
    vi.mocked(exigirSessaoApi).mockResolvedValue(
      new Response(JSON.stringify({ message: "Não autenticado." }), { status: 401 }) as never,
    );

    expect((await GET(criarRequest("GET"))).status).toBe(401);
    expect(
      (await GET_POR_ID(criarRequest("GET"), { params: Promise.resolve({ id: "a1" }) })).status,
    ).toBe(401);
    expect(listarAnalisesInsight).not.toHaveBeenCalled();
    expect(obterAnaliseInsight).not.toHaveBeenCalled();
  });

  it("abre uma análise salva ou responde 404", async () => {
    vi.mocked(obterAnaliseInsight).mockResolvedValueOnce(null);
    const ausente = await GET_POR_ID(criarRequest("GET"), { params: Promise.resolve({ id: "x" }) });
    expect(ausente.status).toBe(404);

    vi.mocked(obterAnaliseInsight).mockResolvedValueOnce({
      id: "a1",
      modelo: "claude-opus-5-5",
      periodoInicio: "2026-10-01",
      periodoFim: "2026-10-31",
      tokensEntrada: 1,
      tokensSaida: 1,
      criadoEm: "2026-10-18T12:00:00.000Z",
      usuarioNome: "Operador",
      analise: ANALISE,
    });
    const encontrada = await GET_POR_ID(criarRequest("GET"), { params: Promise.resolve({ id: "a1" }) });
    expect(encontrada.status).toBe(200);
    expect(await encontrada.json()).toMatchObject({ id: "a1", analise: ANALISE });
  });
});
