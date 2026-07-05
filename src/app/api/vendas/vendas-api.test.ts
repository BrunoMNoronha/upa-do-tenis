import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { registrarVendaBalcaoMock, VendaBalcaoErrorMock } = vi.hoisted(() => {
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
    VendaBalcaoErrorMock,
  };
});

vi.mock("@/lib/vendas", () => ({
  registrarVendaBalcao: registrarVendaBalcaoMock,
  VendaBalcaoError: VendaBalcaoErrorMock,
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
