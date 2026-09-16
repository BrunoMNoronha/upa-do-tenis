import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

// Issue #205: uma OS com vários itens recebidos, cada um com a própria lista
// de serviços. Mesmo estilo de mock de ordens-servico-api.test.ts.

const { prismaMock } = vi.hoisted(() => {
  const mock: any = {
    servico: { findMany: vi.fn() },
    ordemServico: { findUnique: vi.fn(), create: vi.fn() },
    itemOrdemServico: { create: vi.fn() },
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
  listarOrdensServicoPaginado: vi.fn(),
}));

const payloadBase = {
  clienteId: "cliente-1",
  numeroOS: "0001",
  prazoPrevisto: "2026-09-10",
};

const doisItens = [
  {
    clientKey: "local-tenis",
    descricao: "Tênis preto",
    servicos: [
      { servicoId: "servico-limpeza", valor: 40 },
      { servicoId: "servico-cadarco", valor: 15 },
    ],
  },
  {
    clientKey: "local-bota",
    tipoItem: "BOTA",
    descricao: "Bota marrom",
    observacoes: "Salto gasto",
    servicos: [{ servicoId: "servico-sola", valor: 90 }],
  },
];

function criarRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ordens-servico", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dadosDaOrdem() {
  return prismaMock.ordemServico.create.mock.calls[0][0].data;
}

function dadosDosItens() {
  return prismaMock.itemOrdemServico.create.mock.calls.map((chamada: any[]) => chamada[0].data);
}

describe("POST /api/ordens-servico — múltiplos itens (issue #205)", () => {
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
    let contador = 0;
    prismaMock.itemOrdemServico.create.mockImplementation(async () => ({ id: `item-db-${++contador}` }));
    prismaMock.historicoStatus.create.mockResolvedValue({ id: "hist-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cria dois itens com subtotal próprio e total igual à soma dos subtotais", async () => {
    const resposta = await POST(criarRequest({ ...payloadBase, itens: doisItens }));

    expect(resposta.status).toBe(201);

    const ordem = dadosDaOrdem();
    expect(ordem.valorTotal).toBe(145);
    expect(ordem.valorPago).toBe(0);
    expect(ordem.saldo).toBe(145);
    // A OS não cria itens aninhados: eles entram um a um na transação.
    expect(ordem.itens).toBeUndefined();

    const itens = dadosDosItens();
    expect(itens).toHaveLength(2);
    expect(itens[0]).toMatchObject({
      ordemServicoId: "os-1",
      tipoItem: "CALCADO",
      descricao: "Tênis preto",
      valor: 55,
      servicos: { create: doisItens[0].servicos },
    });
    expect(itens[1]).toMatchObject({
      ordemServicoId: "os-1",
      tipoItem: "BOTA",
      descricao: "Bota marrom",
      observacoes: "Salto gasto",
      valor: 90,
      servicos: { create: doisItens[1].servicos },
    });
  });

  it("devolve o mapeamento clientKey → id na ordem informada", async () => {
    const resposta = await POST(criarRequest({ ...payloadBase, itens: doisItens }));
    const body = await resposta.json();

    expect(body.itens).toEqual([
      { id: "item-db-1", clientKey: "local-tenis", descricao: "Tênis preto" },
      { id: "item-db-2", clientKey: "local-bota", descricao: "Bota marrom" },
    ]);
  });

  it("consulta todos os serviços de todos os itens em uma única chamada, sem repetir IDs", async () => {
    await POST(
      criarRequest({
        ...payloadBase,
        itens: [
          { descricao: "Tênis preto", servicos: [{ servicoId: "servico-limpeza", valor: 40 }] },
          { descricao: "Tênis branco", servicos: [{ servicoId: "servico-limpeza", valor: 40 }] },
          { descricao: "Bota", servicos: [{ servicoId: "servico-sola", valor: 90 }] },
        ],
      }),
    );

    expect(prismaMock.servico.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.servico.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["servico-limpeza", "servico-sola"] } },
      select: { id: true, ativo: true },
    });
    expect(dadosDaOrdem().valorTotal).toBe(170);
  });

  it("aceita o mesmo serviço em itens diferentes", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        itens: [
          { descricao: "Tênis preto", servicos: [{ servicoId: "servico-limpeza", valor: 40 }] },
          { descricao: "Tênis branco", servicos: [{ servicoId: "servico-limpeza", valor: 35 }] },
        ],
      }),
    );

    expect(resposta.status).toBe(201);
    expect(dadosDosItens().map((item: any) => item.valor)).toEqual([40, 35]);
  });

  it("rejeita o mesmo serviço repetido dentro do mesmo item sem consultar o banco", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        itens: [
          { descricao: "Tênis preto", servicos: [{ servicoId: "servico-limpeza", valor: 40 }] },
          {
            descricao: "Bota",
            servicos: [
              { servicoId: "servico-sola", valor: 90 },
              { servicoId: "servico-sola", valor: 90 },
            ],
          },
        ],
      }),
    );

    expect(resposta.status).toBe(400);
    expect(prismaMock.servico.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("cria item sem serviço com subtotal zero", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        itens: [
          { descricao: "Tênis preto", servicos: [{ servicoId: "servico-limpeza", valor: 40 }] },
          { descricao: "Bolsa a orçar" },
        ],
      }),
    );

    expect(resposta.status).toBe(201);
    const itens = dadosDosItens();
    expect(itens[1].valor).toBe(0);
    expect(itens[1].servicos).toBeUndefined();
    expect(dadosDaOrdem().valorTotal).toBe(40);
  });

  it("não persiste nada quando um serviço de qualquer item é inexistente", async () => {
    prismaMock.servico.findMany.mockResolvedValue([{ id: "servico-limpeza", ativo: true }]);

    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        itens: [
          { descricao: "Tênis preto", servicos: [{ servicoId: "servico-limpeza", valor: 40 }] },
          { descricao: "Bota", servicos: [{ servicoId: "servico-fantasma", valor: 90 }] },
        ],
      }),
    );

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Um ou mais serviços informados não foram encontrados.");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.ordemServico.create).not.toHaveBeenCalled();
  });

  it("não persiste nada quando um serviço de qualquer item está inativo", async () => {
    prismaMock.servico.findMany.mockResolvedValue([
      { id: "servico-limpeza", ativo: true },
      { id: "servico-sola", ativo: false },
    ]);

    const resposta = await POST(criarRequest({ ...payloadBase, itens: doisItens.slice(0, 1).concat([
      { clientKey: "b", descricao: "Bota", servicos: [{ servicoId: "servico-sola", valor: 90 }] },
    ]) }));

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("propaga a falha ao criar o segundo item para que a transação desfaça a OS", async () => {
    prismaMock.itemOrdemServico.create
      .mockResolvedValueOnce({ id: "item-db-1" })
      .mockRejectedValueOnce(new Error("falha no banco"));
    // Simula o rollback: a transação rejeita quando o callback rejeita.
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));

    const resposta = await POST(criarRequest({ ...payloadBase, itens: doisItens }));

    expect(resposta.status).toBe(500);
    expect(prismaMock.ordemServico.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.itemOrdemServico.create).toHaveBeenCalledTimes(2);
  });

  it("rejeita mais de dez itens com erro de validação", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        itens: Array.from({ length: 11 }, (_, indice) => ({ descricao: `Item ${indice + 1}` })),
      }),
    );

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita item sem descrição com erro de validação", async () => {
    const resposta = await POST(
      criarRequest({ ...payloadBase, itens: [{ descricao: "Tênis preto" }, { descricao: "" }] }),
    );

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("mantém o contrato antigo convertendo-o em um único item", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        itemRecebido: "Tênis preto",
        valorEstimado: 100,
        servicos: [{ servicoId: "servico-limpeza", valor: 100 }],
      }),
    );

    expect(resposta.status).toBe(201);
    const body = await resposta.json();
    expect(body.itens).toEqual([{ id: "item-db-1", clientKey: "item-1", descricao: "Tênis preto" }]);
    expect(dadosDosItens()).toHaveLength(1);
    expect(dadosDaOrdem().valorTotal).toBe(100);
  });

  it("prioriza itens[] quando o payload traz também o contrato antigo", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        itemRecebido: "Ignorado",
        servicos: [{ servicoId: "servico-ignorado", valor: 999 }],
        itens: [{ descricao: "Bota", servicos: [{ servicoId: "servico-sola", valor: 90 }] }],
      }),
    );

    expect(resposta.status).toBe(201);
    expect(prismaMock.servico.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["servico-sola"] } },
      select: { id: true, ativo: true },
    });
    expect(dadosDosItens()[0].descricao).toBe("Bota");
    expect(dadosDaOrdem().valorTotal).toBe(90);
  });
});
