import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockExigirSessaoApi, mockObterResumoCaixaAberto } = vi.hoisted(() => ({
  mockExigirSessaoApi: vi.fn(),
  mockObterResumoCaixaAberto: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: mockExigirSessaoApi }));
vi.mock("@/lib/caixa", () => ({ obterResumoCaixaAberto: mockObterResumoCaixaAberto }));

import { GET } from "./route";

const criarRequest = () => new NextRequest("http://localhost/api/caixa/alerta");

describe("GET /api/caixa/alerta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("exige sessão e não consulta o caixa sem autenticação", async () => {
    mockExigirSessaoApi.mockResolvedValueOnce(new Response("Nao autenticado", { status: 401 }));

    const res = await GET(criarRequest());

    expect(res.status).toBe(401);
    expect(mockObterResumoCaixaAberto).not.toHaveBeenCalled();
  });

  it("sem caixa aberto retorna estado FECHADO", async () => {
    mockExigirSessaoApi.mockResolvedValueOnce(null);
    mockObterResumoCaixaAberto.mockResolvedValueOnce(null);

    const res = await GET(criarRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      estado: "FECHADO",
      caixaId: null,
      dataAbertura: null,
      horaAbertura: null,
    });
  });

  it("caixa de dia operacional anterior retorna FECHAMENTO_PENDENTE", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
    mockExigirSessaoApi.mockResolvedValueOnce(null);
    mockObterResumoCaixaAberto.mockResolvedValueOnce({
      id: "caixa-1",
      dataAbertura: new Date("2026-09-15T11:03:00Z"),
    });

    const res = await GET(criarRequest());

    expect(await res.json()).toEqual({
      estado: "FECHAMENTO_PENDENTE",
      caixaId: "caixa-1",
      dataAbertura: "15/09/2026",
      horaAbertura: "08:03",
    });
  });

  it("falha na consulta retorna 500, nunca FECHADO", async () => {
    mockExigirSessaoApi.mockResolvedValueOnce(null);
    mockObterResumoCaixaAberto.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(criarRequest());
    const corpo = await res.json();

    expect(res.status).toBe(500);
    expect(corpo.estado).toBeUndefined();
  });
});
