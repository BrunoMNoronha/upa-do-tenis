import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: vi.fn() }));
vi.mock("@/lib/insights-config", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/insights-config")>();
  return {
    chaveClaudeSchema: original.chaveClaudeSchema,
    obterStatusChaveClaude: vi.fn(),
    salvarChaveClaude: vi.fn(),
    removerChaveClaude: vi.fn(),
    obterChaveClaude: vi.fn(),
  };
});
vi.mock("@/lib/insights-ia", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/insights-ia")>();
  return { ...original, testarChaveClaude: vi.fn() };
});

import { exigirSessaoApi } from "@/lib/auth-server";
import {
  obterChaveClaude,
  obterStatusChaveClaude,
  removerChaveClaude,
  salvarChaveClaude,
} from "@/lib/insights-config";
import { ErroInsightsIA, testarChaveClaude } from "@/lib/insights-ia";
import { DELETE, GET, PUT } from "./route";
import { POST as TESTAR } from "./testar/route";

const CHAVE = "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWX-wxyz";

function criarRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/configuracoes/claude", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/configuracoes/claude", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exigirSessaoApi).mockResolvedValue(null);
  });

  it("exige sessão em todos os métodos", async () => {
    const naoAutenticado = () =>
      new Response(JSON.stringify({ message: "Não autenticado." }), { status: 401 }) as never;
    vi.mocked(exigirSessaoApi).mockImplementation(async () => naoAutenticado());

    expect((await GET(criarRequest("GET"))).status).toBe(401);
    expect((await PUT(criarRequest("PUT", { apiKey: CHAVE }))).status).toBe(401);
    expect((await DELETE(criarRequest("DELETE"))).status).toBe(401);
    expect((await TESTAR(criarRequest("POST"))).status).toBe(401);
    expect(salvarChaveClaude).not.toHaveBeenCalled();
    expect(removerChaveClaude).not.toHaveBeenCalled();
  });

  it("GET devolve apenas status e últimos 4 caracteres, sem cache", async () => {
    vi.mocked(obterStatusChaveClaude).mockResolvedValue({ configurada: true, ultimosQuatro: "wxyz" });

    const res = await GET(criarRequest("GET"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ configurada: true, ultimosQuatro: "wxyz" });
  });

  it("PUT salva chave válida sem ecoá-la na resposta", async () => {
    vi.mocked(salvarChaveClaude).mockResolvedValue({ configurada: true, ultimosQuatro: "wxyz" });

    const res = await PUT(criarRequest("PUT", { apiKey: CHAVE }));
    const corpo = await res.text();

    expect(res.status).toBe(200);
    expect(salvarChaveClaude).toHaveBeenCalledWith(CHAVE);
    expect(corpo).not.toContain(CHAVE);
    expect(JSON.parse(corpo)).toMatchObject({ configurada: true, ultimosQuatro: "wxyz" });
  });

  it("PUT rejeita formato inválido com 400", async () => {
    const res = await PUT(criarRequest("PUT", { apiKey: "chave-qualquer" }));

    expect(res.status).toBe(400);
    expect(salvarChaveClaude).not.toHaveBeenCalled();
  });

  it("DELETE remove a chave", async () => {
    const res = await DELETE(criarRequest("DELETE"));

    expect(res.status).toBe(200);
    expect(removerChaveClaude).toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ configurada: false, ultimosQuatro: null });
  });

  it("POST /testar responde 409 sem chave, 200 com chave válida e mapeia erro da API", async () => {
    vi.mocked(obterChaveClaude).mockResolvedValueOnce(null);
    const semChave = await TESTAR(criarRequest("POST"));
    expect(semChave.status).toBe(409);
    expect(await semChave.json()).toMatchObject({ codigo: "CHAVE_NAO_CONFIGURADA" });

    vi.mocked(obterChaveClaude).mockResolvedValue(CHAVE);
    vi.mocked(testarChaveClaude).mockResolvedValueOnce(undefined);
    expect((await TESTAR(criarRequest("POST"))).status).toBe(200);
    expect(testarChaveClaude).toHaveBeenCalledWith(CHAVE);

    vi.mocked(testarChaveClaude).mockRejectedValueOnce(new ErroInsightsIA("CHAVE_INVALIDA", "Chave recusada."));
    const invalida = await TESTAR(criarRequest("POST"));
    expect(invalida.status).toBe(502);
    expect(await invalida.json()).toEqual({ message: "Chave recusada.", codigo: "CHAVE_INVALIDA" });
  });
});
