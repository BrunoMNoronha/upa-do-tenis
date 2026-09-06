import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => {
  const mock: any = {
    servico: { findMany: vi.fn() },
    ordemServico: { findUnique: vi.fn(), create: vi.fn() },
    historicoStatus: { create: vi.fn() },
    $transaction: vi.fn(async (callback: any) => callback(mock)),
  };

  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Estes testes cobrem as regras de negócio da API; simulam requisição já
// autenticada. O enforcement de sessão é coberto em api-auth-enforcement.test.ts.
vi.mock("@/lib/auth-server", () => ({
  obterUsuarioSessaoDaRequest: vi.fn().mockResolvedValue({
    id: "usuario-1",
    nome: "Bruno Alves",
    email: "bruno@sapataria.com",
    ativo: true,
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const payloadBase = {
  clienteId: "cliente-1",
  numeroSufixo: "0001",
  itemRecebido: "Tênis preto",
  prazoPrevisto: "2026-09-10",
  valorEstimado: 100,
  servicos: [{ servicoId: "servico-1", valor: 100 }],
};

function criarRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ordens-servico", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function argumentosDoCreate() {
  return prismaMock.ordemServico.create.mock.calls[0][0];
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("POST /api/ordens-servico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // 05/09/2026 12:00 em Brasília.
    vi.setSystemTime(new Date("2026-09-05T15:00:00Z"));

    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.servico.findMany.mockResolvedValue([{ id: "servico-1", ativo: true }]);
    prismaMock.ordemServico.findUnique.mockResolvedValue(null);
    prismaMock.ordemServico.create.mockResolvedValue({ id: "os-1", numero: "OS-05092026-0001" });
    prismaMock.historicoStatus.create.mockResolvedValue({ id: "hist-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cria OS sem data informada usando a data atual e sem registro de rastreabilidade", async () => {
    const resposta = await POST(criarRequest(payloadBase));

    expect(resposta.status).toBe(201);
    expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();

    const dataEntrada = argumentosDoCreate().data.dataEntrada as Date;
    expect(dataEntrada).toBeInstanceOf(Date);
    expect(dataEntrada.getTime()).toBe(new Date("2026-09-05T15:00:00Z").getTime());
  });

  it("cria OS com data retroativa e registra a rastreabilidade no histórico", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        dataEntrada: "2026-09-01",
        justificativaDataEntrada: "OS anotada no caderno durante a queda de energia.",
      }),
    );

    expect(resposta.status).toBe(201);

    const dataEntrada = argumentosDoCreate().data.dataEntrada as Date;
    expect(dataEntrada.getFullYear()).toBe(2026);
    expect(dataEntrada.getMonth()).toBe(8);
    expect(dataEntrada.getDate()).toBe(1);

    expect(prismaMock.historicoStatus.create).toHaveBeenCalledTimes(1);
    const historico = prismaMock.historicoStatus.create.mock.calls[0][0].data;
    expect(historico.ordemServicoId).toBe("os-1");
    expect(historico.statusAnterior).toBeNull();
    expect(historico.statusNovo).toBe("ABERTA");
    expect(historico.observacao).toContain("[REGISTRO RETROATIVO]");
    expect(historico.observacao).toContain("01/09/2026");
    expect(historico.observacao).toContain("Bruno Alves");
    expect(historico.observacao).toContain("queda de energia");
  });

  it("mantém a numeração baseada na data de digitação mesmo com data retroativa", async () => {
    await POST(
      criarRequest({
        ...payloadBase,
        dataEntrada: "2026-09-01",
        justificativaDataEntrada: "OS anotada no caderno durante a queda de energia.",
      }),
    );

    expect(argumentosDoCreate().data.numero).toBe("OS-05092026-0001");
  });

  it("rejeita data futura sem abrir transação", async () => {
    const resposta = await POST(criarRequest({ ...payloadBase, dataEntrada: "2026-09-06" }));

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita data retroativa sem justificativa sem abrir transação", async () => {
    const resposta = await POST(criarRequest({ ...payloadBase, dataEntrada: "2026-09-01" }));

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("mantém o 409 de número duplicado antes da transação", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce({ id: "os-existente" });

    const resposta = await POST(criarRequest(payloadBase));

    expect(resposta.status).toBe(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("desfaz a criação quando o registro de rastreabilidade falha", async () => {
    prismaMock.historicoStatus.create.mockRejectedValueOnce(new Error("falha ao gravar histórico"));

    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        dataEntrada: "2026-09-01",
        justificativaDataEntrada: "OS anotada no caderno durante a queda de energia.",
      }),
    );

    expect(resposta.status).toBe(500);
  });
});
