import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), caixa: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: mocks.sessao }));
vi.mock("@/lib/caixa", () => ({ obterCaixaAberto: mocks.caixa, CaixaError: class extends Error {} }));
const { GET } = await import("./route");
const req = () => new NextRequest("http://localhost/api/caixa/atual");

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
  mocks.sessao.mockResolvedValue(null);
});
afterEach(() => vi.useRealTimers());

describe("caixa atual e classificação da mesma leitura", () => {
  it("mantém o caixa completo e acrescenta o alerta pendente", async () => {
    const caixa = { id: "anterior", dataAbertura: "2026-10-04T11:00:00Z", totais: { saldoFisicoCalculado: 100 } };
    mocks.caixa.mockResolvedValue(caixa);
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ caixa, alerta: {
      estado: "FECHAMENTO_PENDENTE", caixaId: "anterior", dataAbertura: "04/10/2026", horaAbertura: "08:00",
    } });
    expect(mocks.caixa).toHaveBeenCalledTimes(1);
  });

  it("não interpreta caixa inexistente como pendência", async () => {
    mocks.caixa.mockResolvedValue(null);
    expect(await (await GET(req())).json()).toEqual({ caixa: null, alerta: {
      estado: "FECHADO", caixaId: null, dataAbertura: null, horaAbertura: null,
    } });
  });

  it("retorna erro JSON sem inventar caixa ou redirecionar", async () => {
    mocks.caixa.mockRejectedValue(new Error("indisponível"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Ocorreu um erro interno." });
    expect(res.headers.get("location")).toBeNull();
  });

  it("preserva 401 JSON e não consulta caixa sem sessão", async () => {
    mocks.sessao.mockResolvedValue(Response.json({ message: "Não autenticado." }, { status: 401 }));
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mocks.caixa).not.toHaveBeenCalled();
  });
});
