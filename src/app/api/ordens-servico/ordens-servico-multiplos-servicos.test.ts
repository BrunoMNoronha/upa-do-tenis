import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

// Fatia de testes da Issue #3 (múltiplos serviços por OS) — criação.
// Caracteriza o comportamento atual de POST /api/ordens-servico sem tocar em
// código de produção. Usa o mesmo estilo de mock de ordens-servico-api.test.ts.

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

vi.mock("@/lib/auth-server", () => ({
  obterUsuarioSessaoDaRequest: vi.fn().mockResolvedValue({
    id: "usuario-1",
    nome: "Bruno Alves",
    email: "bruno@sapataria.com",
    ativo: true,
  }),
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/ordens-servico", () => ({
  listarOrdensServico: vi.fn(),
}));

const payloadBase = {
  clienteId: "cliente-1",
  itemRecebido: "Tênis preto",
  prazoPrevisto: "2026-09-10",
  valorEstimado: 0,
};

function criarRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ordens-servico", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dadosDoCreate() {
  return prismaMock.ordemServico.create.mock.calls[0][0].data;
}

describe("POST /api/ordens-servico — múltiplos serviços (Issue #3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T15:00:00Z"));

    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.servico.findMany.mockImplementation(async ({ where }: any) =>
      (where.id.in as string[]).map((id) => ({ id, ativo: true })),
    );
    prismaMock.ordemServico.findUnique.mockResolvedValue(null);
    prismaMock.ordemServico.create.mockResolvedValue({ id: "os-1", numero: "OS-05092026-0001" });
    prismaMock.historicoStatus.create.mockResolvedValue({ id: "hist-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cria OS com dois serviços somando os valores individuais no total e no saldo", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        servicos: [
          { servicoId: "servico-1", valor: 100 },
          { servicoId: "servico-2", valor: 75.5 },
        ],
      }),
    );

    expect(resposta.status).toBe(201);
    expect(prismaMock.servico.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["servico-1", "servico-2"] } },
      select: { id: true, ativo: true },
    });

    const data = dadosDoCreate();
    expect(data.valorTotal).toBe(175.5);
    expect(data.valorPago).toBe(0);
    expect(data.saldo).toBe(175.5);
    expect(data.itens.create.valor).toBe(175.5);
    expect(data.itens.create.servicos.create).toEqual([
      { servicoId: "servico-1", valor: 100 },
      { servicoId: "servico-2", valor: 75.5 },
    ]);
  });

  it("mantém o fluxo com um único serviço", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        servicos: [{ servicoId: "servico-1", valor: 80 }],
      }),
    );

    expect(resposta.status).toBe(201);

    const data = dadosDoCreate();
    expect(data.valorTotal).toBe(80);
    expect(data.saldo).toBe(80);
    expect(data.itens.create.servicos.create).toEqual([{ servicoId: "servico-1", valor: 80 }]);
  });

  it("ignora valorEstimado divergente quando há serviços informados", async () => {
    await POST(
      criarRequest({
        ...payloadBase,
        valorEstimado: 999,
        servicos: [
          { servicoId: "servico-1", valor: 40 },
          { servicoId: "servico-2", valor: 35.5 },
        ],
      }),
    );

    const data = dadosDoCreate();
    expect(data.valorTotal).toBe(75.5);
    expect(data.itens.create.valor).toBe(75.5);
  });

  it("aceita o contrato legado (servicoId + valorEstimado) criando um único vínculo", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        servicoId: "servico-legado",
        valorEstimado: 120,
      }),
    );

    expect(resposta.status).toBe(201);
    expect(prismaMock.servico.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["servico-legado"] } },
      select: { id: true, ativo: true },
    });

    const data = dadosDoCreate();
    expect(data.valorTotal).toBe(120);
    expect(data.itens.create.valor).toBe(120);
    expect(data.itens.create.servicos.create).toEqual([{ servicoId: "servico-legado", valor: 120 }]);
  });

  it("prioriza a lista de serviços sobre o servicoId legado quando ambos vêm no payload", async () => {
    await POST(
      criarRequest({
        ...payloadBase,
        servicoId: "servico-legado",
        valorEstimado: 999,
        servicos: [{ servicoId: "servico-1", valor: 50 }],
      }),
    );

    const data = dadosDoCreate();
    expect(data.valorTotal).toBe(50);
    expect(data.itens.create.servicos.create).toEqual([{ servicoId: "servico-1", valor: 50 }]);
  });

  it("aplica arredondamento monetário ao total e ao valor do item", async () => {
    // 10.1 + 20.2 em ponto flutuante = 30.299999999999997.
    await POST(
      criarRequest({
        ...payloadBase,
        servicos: [
          { servicoId: "servico-1", valor: 10.1 },
          { servicoId: "servico-2", valor: 20.2 },
        ],
      }),
    );

    const data = dadosDoCreate();
    expect(data.valorTotal).toBe(30.3);
    expect(data.saldo).toBe(30.3);
    expect(data.itens.create.valor).toBe(30.3);
  });

  it("rejeita o mesmo serviço repetido antes de consultar o banco", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        servicos: [
          { servicoId: "servico-1", valor: 10 },
          { servicoId: "servico-1", valor: 20 },
        ],
      }),
    );

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Não é possível repetir o mesmo serviço na OS.");
    expect(prismaMock.servico.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita serviço inexistente sem abrir transação", async () => {
    prismaMock.servico.findMany.mockResolvedValue([{ id: "servico-1", ativo: true }]);

    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        servicos: [
          { servicoId: "servico-1", valor: 10 },
          { servicoId: "servico-inexistente", valor: 20 },
        ],
      }),
    );

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Um ou mais serviços informados não foram encontrados.");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita serviço inativo sem abrir transação", async () => {
    prismaMock.servico.findMany.mockResolvedValue([
      { id: "servico-1", ativo: true },
      { id: "servico-2", ativo: false },
    ]);

    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        servicos: [
          { servicoId: "servico-1", valor: 10 },
          { servicoId: "servico-2", valor: 20 },
        ],
      }),
    );

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe(
      "Serviços inativos não podem ser adicionados a uma nova OS.",
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita payload sem nenhum serviço com erro de validação", async () => {
    const resposta = await POST(criarRequest({ ...payloadBase, servicos: [] }));

    expect(resposta.status).toBe(400);
    const body = await resposta.json();
    expect(body.message).toBe("Dados inválidos.");
    expect(body.errors.fieldErrors.servicos).toContain("Informe pelo menos um serviço.");
    expect(prismaMock.servico.findMany).not.toHaveBeenCalled();
  });

  it("rejeita serviço com valor negativo com erro de validação", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        servicos: [{ servicoId: "servico-1", valor: -5 }],
      }),
    );

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Dados inválidos.");
    expect(prismaMock.servico.findMany).not.toHaveBeenCalled();
  });
});
