import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { registrarVendaBalcaoMock, listarVendasBalcaoMock, obterVendaPorIdMock, VendaBalcaoErrorMock } = vi.hoisted(() => {
  class VendaBalcaoErrorMock extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.name = "VendaBalcaoError";
      this.status = status;
    }
  }

  return {
    registrarVendaBalcaoMock: vi.fn(),
    listarVendasBalcaoMock: vi.fn(),
    obterVendaPorIdMock: vi.fn(),
    VendaBalcaoErrorMock,
  };
});

vi.mock("@/lib/vendas", () => ({
  registrarVendaBalcao: registrarVendaBalcaoMock,
  listarVendasBalcao: listarVendasBalcaoMock,
  obterVendaPorId: obterVendaPorIdMock,
  VendaBalcaoError: VendaBalcaoErrorMock,
}));

// Estes testes cobrem as regras de negócio da API; simulam requisição já
// autenticada. O enforcement de sessão é coberto em api-auth-enforcement.test.ts.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const payloadValido = {
  formaPagamentoId: "forma-1",
  itens: [{ produtoId: "prod-1", quantidade: 2 }],
};

function criarRequest(body: unknown) {
  return new NextRequest("http://localhost/api/vendas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("POST /api/vendas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 201 com dados da venda em caso de sucesso", async () => {
    const vendaFake = {
      id: "venda-1",
      numero: "VD-05072026-0001",
      valorTotal: 31.8,
    };
    registrarVendaBalcaoMock.mockResolvedValueOnce(vendaFake);

    const response = await POST(criarRequest(payloadValido));
    const body = await response.json() as typeof vendaFake;

    expect(response.status).toBe(201);
    expect(body.numero).toBe("VD-05072026-0001");
    expect(registrarVendaBalcaoMock).toHaveBeenCalledOnce();
  });

  it("retorna 400 quando o schema é inválido (sem formaPagamentoId)", async () => {
    const response = await POST(criarRequest({ itens: [{ produtoId: "x", quantidade: 1 }] }));

    expect(response.status).toBe(400);
    expect(registrarVendaBalcaoMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando itens está vazio", async () => {
    const response = await POST(criarRequest({ formaPagamentoId: "f1", itens: [] }));

    expect(response.status).toBe(400);
    expect(registrarVendaBalcaoMock).not.toHaveBeenCalled();
  });

  it("retorna 400 com mensagem de VendaBalcaoError (caixa fechado)", async () => {
    registrarVendaBalcaoMock.mockRejectedValueOnce(
      new VendaBalcaoErrorMock("Não há caixa aberto. Abra o caixa primeiro.", 400),
    );

    const response = await POST(criarRequest(payloadValido));
    const body = await response.json() as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("Não há caixa aberto. Abra o caixa primeiro.");
  });

  it("retorna o status correto quando VendaBalcaoError tem status personalizado", async () => {
    registrarVendaBalcaoMock.mockRejectedValueOnce(
      new VendaBalcaoErrorMock("Produto inativo.", 400),
    );

    const response = await POST(criarRequest(payloadValido));

    expect(response.status).toBe(400);
  });

  it("retorna 500 para erro inesperado", async () => {
    registrarVendaBalcaoMock.mockRejectedValueOnce(new Error("Falha de banco"));

    const response = await POST(criarRequest(payloadValido));

    expect(response.status).toBe(500);
  });
});

import { GET as GET_VENDAS } from "./route";

describe("GET /api/vendas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista vendas sem filtros", async () => {
    listarVendasBalcaoMock.mockResolvedValueOnce([{ id: "1" }]);
    const req = new NextRequest("http://localhost/api/vendas");
    const response = await GET_VENDAS(req);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "1" }]);
    expect(listarVendasBalcaoMock).toHaveBeenCalledWith({ dataInicial: undefined, dataFinal: undefined, formaPagamentoId: undefined });
  });

  it("lista vendas com filtros de período", async () => {
    listarVendasBalcaoMock.mockResolvedValueOnce([]);
    const req = new NextRequest("http://localhost/api/vendas?dataInicial=2026-07-01&dataFinal=2026-07-31");
    const response = await GET_VENDAS(req);
    expect(response.status).toBe(200);
    expect(listarVendasBalcaoMock).toHaveBeenCalledWith({
      dataInicial: "2026-07-01",
      dataFinal: "2026-07-31",
      formaPagamentoId: undefined,
    });
  });
  
  it("retorna 400 se listarVendasBalcao disparar VendaBalcaoError (data inválida)", async () => {
    listarVendasBalcaoMock.mockRejectedValueOnce(new VendaBalcaoErrorMock("Data inválida", 400));
    const req = new NextRequest("http://localhost/api/vendas?dataInicial=abc");
    const response = await GET_VENDAS(req);
    expect(response.status).toBe(400);
  });
});

import { GET as GET_VENDA_ID } from "./[id]/route";

describe("GET /api/vendas/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna detalhes da venda", async () => {
    obterVendaPorIdMock.mockResolvedValueOnce({ id: "v1", numero: "001" });
    const req = new NextRequest("http://localhost/api/vendas/v1");
    const response = await GET_VENDA_ID(req, { params: { id: "v1" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "v1", numero: "001" });
    expect(obterVendaPorIdMock).toHaveBeenCalledWith("v1");
  });

  it("retorna 404 para venda inexistente", async () => {
    obterVendaPorIdMock.mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost/api/vendas/v99");
    const response = await GET_VENDA_ID(req, { params: { id: "v99" } });
    expect(response.status).toBe(404);
  });
});

