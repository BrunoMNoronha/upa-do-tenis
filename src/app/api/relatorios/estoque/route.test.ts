import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), stats: vi.fn(), criticos: vi.fn(), extrato: vi.fn(), resumo: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: mocks.auth }));
vi.mock("@/lib/relatorio-estoque-service", () => ({
  getEstatisticasGlobaisEstoque: mocks.stats, getListaInsumosCriticos: mocks.criticos,
  getExtratoMovimentacoes: mocks.extrato, getResumoPorTipo: mocks.resumo,
}));
import { GET } from "./route";

describe("segurança da resposta do relatório de estoque", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue(null);
    mocks.stats.mockResolvedValue({ total: 3 });
    mocks.criticos.mockResolvedValue([]);
    mocks.extrato.mockResolvedValue([]);
    mocks.resumo.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("não expõe detalhes internos quando o serviço falha", async () => {
    mocks.stats.mockRejectedValue(new Error("senha-interna host-db tabela-secreta"));
    const response = await GET(new NextRequest("http://localhost/api/relatorios/estoque"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Erro ao gerar o relatório. Ocorreu uma falha interna." });
    expect(console.error).toHaveBeenCalled();
  });
  it("preserva o contrato de sucesso e os filtros", async () => {
    const response = await GET(new NextRequest("http://localhost/api/relatorios/estoque?insumoId=teste"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ estatisticas: { total: 3 }, criticos: [], movimentacoes: [], resumoTipos: [] });
    expect(mocks.extrato).toHaveBeenCalledWith({ insumoId: "teste" }, 100);
  });
  it("bloqueia consultas sem sessão", async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({ message: "Não autenticado." }, { status: 401 }));
    expect((await GET(new NextRequest("http://localhost/api/relatorios/estoque"))).status).toBe(401);
    expect(mocks.stats).not.toHaveBeenCalled();
  });
});
