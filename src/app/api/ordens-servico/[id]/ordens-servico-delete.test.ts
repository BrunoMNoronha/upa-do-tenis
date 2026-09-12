import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), pagamento: vi.fn(), estoque: vi.fn(), caixa: vi.fn(), historico: vi.fn(), excluir: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  pagamento: { count: mocks.pagamento }, movimentacaoEstoqueInsumo: { count: mocks.estoque },
  movimentacaoCaixa: { count: mocks.caixa }, historicoStatus: { count: mocks.historico },
  ordemServico: { delete: mocks.excluir },
} }));
import { DELETE } from "./route";
const osId = "cm00000000000000000000001";
const executar = (id = osId) => DELETE(new NextRequest(`http://localhost/api/ordens-servico/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });
describe("salvaguardas da exclusão física de OS", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue(null);
    for (const key of ["pagamento", "estoque", "caixa", "historico"] as const) mocks[key].mockResolvedValue(0);
    mocks.excluir.mockResolvedValue({ id: osId });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());
  it.each(["pagamento", "estoque", "caixa", "historico"] as const)("bloqueia vínculo de %s isoladamente", async (key) => {
    mocks[key].mockResolvedValue(1);
    expect((await executar()).status).toBe(409);
    expect(mocks.excluir).not.toHaveBeenCalled();
  });
  it("exclui somente com todos os contadores zerados", async () => {
    expect((await executar()).status).toBe(204);
    for (const key of ["pagamento", "estoque", "caixa"] as const) {
      expect(mocks[key]).toHaveBeenCalledWith({ where: { ordemServicoId: osId } });
    }
    expect(mocks.historico).toHaveBeenCalledWith({ where: { ordemServicoId: osId, statusAnterior: { not: null } } });
    expect(mocks.excluir).toHaveBeenCalledWith({ where: { id: osId } });
  });
  it.each(["pagamento", "estoque", "caixa", "historico"] as const)("não exclui se a consulta de %s falhar", async (key) => {
    mocks[key].mockRejectedValue(new Error("falha interna"));
    const response = await executar();
    expect(response.status).toBe(500);
    expect(mocks.excluir).not.toHaveBeenCalled();
  });
  it("bloqueia usuário sem sessão antes de consultar", async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({}, { status: 401 }));
    expect((await executar()).status).toBe(401);
    expect(mocks.pagamento).not.toHaveBeenCalled();
    expect(mocks.excluir).not.toHaveBeenCalled();
  });
  it("bloqueia identificador inválido", async () => {
    expect((await executar("")).status).toBe(400);
    expect(mocks.excluir).not.toHaveBeenCalled();
  });
});
