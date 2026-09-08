import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { PATCH } from "./route";

// Fatia de testes da Issue #3 (múltiplos serviços por OS) — edição/remoção.
// Caracteriza o comportamento atual de PATCH /api/ordens-servico/[id] sem
// tocar em código de produção.

const { prismaMock } = vi.hoisted(() => {
  const mock: any = {
    itemOrdemServico: { findFirst: vi.fn(), update: vi.fn() },
    servico: { findMany: vi.fn() },
    servicoItemOrdem: { deleteMany: vi.fn(), createMany: vi.fn() },
    ordemServico: { findUnique: vi.fn(), update: vi.fn() },
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

const OS_ID = "os-1";
const ITEM_ID = "item-1";

type ServicoPayload = { servicoId: string; valor: number };

function criarRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/ordens-servico/${OS_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function chamarPatch(body: unknown) {
  return PATCH(criarRequest(body), { params: Promise.resolve({ id: OS_ID }) });
}

/**
 * Faz o mock refletir a OS após a troca dos serviços: o findUnique da
 * transação devolve os vínculos recém-criados, como o Prisma faria.
 */
function configurarOrdem(opcoes: {
  servicosAtuais?: ServicoPayload[];
  novosServicos: ServicoPayload[];
  valorPago?: number;
  pagamentos?: number[];
  valorDesconto?: number;
  valorSinal?: number;
  status?: string;
}) {
  const {
    servicosAtuais = [{ servicoId: "servico-1", valor: 100 }],
    novosServicos,
    valorPago = 0,
    pagamentos = [],
    valorDesconto = 0,
    valorSinal = 0,
    status = "ABERTA",
  } = opcoes;

  prismaMock.itemOrdemServico.findFirst.mockResolvedValue({
    id: ITEM_ID,
    servicos: servicosAtuais.map((servico) => ({ servicoId: servico.servicoId })),
  });

  prismaMock.ordemServico.findUnique.mockResolvedValue({
    id: OS_ID,
    status,
    valorDesconto: new Prisma.Decimal(valorDesconto),
    valorSinal: new Prisma.Decimal(valorSinal),
    valorPago: new Prisma.Decimal(valorPago),
    pagamentos: pagamentos.map((valor, indice) => ({
      id: `pag-${indice}`,
      valor: new Prisma.Decimal(valor),
    })),
    itens: [
      {
        id: ITEM_ID,
        valor: new Prisma.Decimal(novosServicos.reduce((total, servico) => total + servico.valor, 0)),
        servicos: novosServicos.map((servico, indice) => ({
          id: `sio-${indice}`,
          servicoId: servico.servicoId,
          valor: new Prisma.Decimal(servico.valor),
        })),
      },
    ],
  });
}

function dadosDoUpdateDaOrdem() {
  return prismaMock.ordemServico.update.mock.calls[0][0].data;
}

describe("PATCH /api/ordens-servico/[id] — serviços da OS (Issue #3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.servico.findMany.mockImplementation(async ({ where }: any) =>
      (where.id.in as string[]).map((id) => ({ id, ativo: true })),
    );
    prismaMock.servicoItemOrdem.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.servicoItemOrdem.createMany.mockResolvedValue({ count: 1 });
    prismaMock.itemOrdemServico.update.mockResolvedValue({ id: ITEM_ID });
    prismaMock.ordemServico.update.mockImplementation(async ({ data }: any) => ({ id: OS_ID, ...data }));
  });

  it("adiciona um segundo serviço mantendo o primeiro e recalcula total e saldo", async () => {
    const novos = [
      { servicoId: "servico-1", valor: 100 },
      { servicoId: "servico-2", valor: 75.5 },
    ];
    configurarOrdem({ novosServicos: novos });

    const resposta = await chamarPatch({ itemOrdemServicoId: ITEM_ID, servicos: novos });

    expect(resposta.status).toBe(200);
    expect(prismaMock.servicoItemOrdem.deleteMany).toHaveBeenCalledWith({
      where: { itemOrdemServicoId: ITEM_ID },
    });
    expect(prismaMock.servicoItemOrdem.createMany).toHaveBeenCalledWith({
      data: [
        { itemOrdemServicoId: ITEM_ID, servicoId: "servico-1", valor: 100 },
        { itemOrdemServicoId: ITEM_ID, servicoId: "servico-2", valor: 75.5 },
      ],
    });
    expect(prismaMock.itemOrdemServico.update).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
      data: { valor: 175.5 },
    });

    const data = dadosDoUpdateDaOrdem();
    expect(data.valorTotal).toBe(175.5);
    expect(data.valorPago).toBe(0);
    expect(data.saldo).toBe(175.5);
  });

  it("remove um serviço sem remover os demais", async () => {
    const novos = [{ servicoId: "servico-1", valor: 100 }];
    configurarOrdem({
      servicosAtuais: [
        { servicoId: "servico-1", valor: 100 },
        { servicoId: "servico-2", valor: 75.5 },
      ],
      novosServicos: novos,
    });

    const resposta = await chamarPatch({ itemOrdemServicoId: ITEM_ID, servicos: novos });

    expect(resposta.status).toBe(200);
    expect(prismaMock.servicoItemOrdem.createMany).toHaveBeenCalledWith({
      data: [{ itemOrdemServicoId: ITEM_ID, servicoId: "servico-1", valor: 100 }],
    });
    expect(prismaMock.itemOrdemServico.update).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
      data: { valor: 100 },
    });

    const data = dadosDoUpdateDaOrdem();
    expect(data.valorTotal).toBe(100);
    expect(data.saldo).toBe(100);
  });

  it("altera o valor de um serviço existente e reflete no total", async () => {
    const novos = [{ servicoId: "servico-1", valor: 130 }];
    configurarOrdem({ novosServicos: novos });

    const resposta = await chamarPatch({ itemOrdemServicoId: ITEM_ID, servicos: novos });

    expect(resposta.status).toBe(200);
    expect(dadosDoUpdateDaOrdem().valorTotal).toBe(130);
  });

  it("preserva pagamentos já registrados ao recalcular o saldo", async () => {
    const novos = [
      { servicoId: "servico-1", valor: 100 },
      { servicoId: "servico-2", valor: 50 },
    ];
    configurarOrdem({ novosServicos: novos, pagamentos: [30, 20] });

    const resposta = await chamarPatch({ itemOrdemServicoId: ITEM_ID, servicos: novos });

    expect(resposta.status).toBe(200);
    const data = dadosDoUpdateDaOrdem();
    expect(data.valorTotal).toBe(150);
    expect(data.valorPago).toBe(50);
    expect(data.saldo).toBe(100);
  });

  it("aplica arredondamento monetário ao total da OS e ao valor do item", async () => {
    // 10.1 + 20.2 em ponto flutuante = 30.299999999999997.
    const novos = [
      { servicoId: "servico-1", valor: 10.1 },
      { servicoId: "servico-2", valor: 20.2 },
    ];
    configurarOrdem({ novosServicos: novos });

    await chamarPatch({ itemOrdemServicoId: ITEM_ID, servicos: novos });

    expect(dadosDoUpdateDaOrdem().valorTotal).toBe(30.3);
    expect(prismaMock.itemOrdemServico.update).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
      data: { valor: 30.3 },
    });
  });

  it("recusa reduzir o total abaixo do valor já pago (409) sem persistir", async () => {
    const novos = [{ servicoId: "servico-1", valor: 100 }];
    configurarOrdem({ novosServicos: novos, pagamentos: [150] });

    const resposta = await chamarPatch({ itemOrdemServicoId: ITEM_ID, servicos: novos });

    expect(resposta.status).toBe(409);
    expect((await resposta.json()).message).toBe(
      "Não é possível reduzir o total da OS abaixo do valor já pago.",
    );
    expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
  });

  it("rejeita o mesmo serviço repetido antes de abrir transação", async () => {
    const resposta = await chamarPatch({
      itemOrdemServicoId: ITEM_ID,
      servicos: [
        { servicoId: "servico-1", valor: 10 },
        { servicoId: "servico-1", valor: 20 },
      ],
    });

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Não é possível repetir o mesmo serviço na OS.");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita remover todos os serviços (lista vazia) com erro de validação", async () => {
    const resposta = await chamarPatch({ itemOrdemServicoId: ITEM_ID, servicos: [] });

    expect(resposta.status).toBe(400);
    const body = await resposta.json();
    expect(body.message).toBe("Dados inválidos.");
    expect(body.errors.fieldErrors.servicos).toContain("A OS deve possuir pelo menos um serviço.");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o item não pertence à OS", async () => {
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(null);

    const resposta = await chamarPatch({
      itemOrdemServicoId: "item-de-outra-os",
      servicos: [{ servicoId: "servico-1", valor: 10 }],
    });

    expect(resposta.status).toBe(404);
    expect((await resposta.json()).message).toBe("Item da OS não encontrado.");
    expect(prismaMock.itemOrdemServico.findFirst).toHaveBeenCalledWith({
      where: { id: "item-de-outra-os", ordemServicoId: OS_ID },
      select: { id: true, servicos: { select: { servicoId: true } } },
    });
    expect(prismaMock.servicoItemOrdem.deleteMany).not.toHaveBeenCalled();
  });

  it("rejeita serviço inexistente sem apagar os vínculos atuais", async () => {
    configurarOrdem({ novosServicos: [{ servicoId: "servico-1", valor: 10 }] });
    prismaMock.servico.findMany.mockResolvedValue([{ id: "servico-1", ativo: true }]);

    const resposta = await chamarPatch({
      itemOrdemServicoId: ITEM_ID,
      servicos: [
        { servicoId: "servico-1", valor: 10 },
        { servicoId: "servico-inexistente", valor: 20 },
      ],
    });

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Um ou mais serviços informados não foram encontrados.");
    expect(prismaMock.servicoItemOrdem.deleteMany).not.toHaveBeenCalled();
  });

  it("rejeita adicionar serviço inativo que ainda não estava vinculado", async () => {
    configurarOrdem({
      servicosAtuais: [{ servicoId: "servico-1", valor: 100 }],
      novosServicos: [
        { servicoId: "servico-1", valor: 100 },
        { servicoId: "servico-inativo", valor: 20 },
      ],
    });
    prismaMock.servico.findMany.mockResolvedValue([
      { id: "servico-1", ativo: true },
      { id: "servico-inativo", ativo: false },
    ]);

    const resposta = await chamarPatch({
      itemOrdemServicoId: ITEM_ID,
      servicos: [
        { servicoId: "servico-1", valor: 100 },
        { servicoId: "servico-inativo", valor: 20 },
      ],
    });

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Serviços inativos não podem ser adicionados à OS.");
    expect(prismaMock.servicoItemOrdem.deleteMany).not.toHaveBeenCalled();
  });

  it("mantém serviço inativo que já estava vinculado à OS (OS legada)", async () => {
    const novos = [
      { servicoId: "servico-inativo", valor: 100 },
      { servicoId: "servico-2", valor: 25 },
    ];
    configurarOrdem({
      servicosAtuais: [{ servicoId: "servico-inativo", valor: 100 }],
      novosServicos: novos,
    });
    prismaMock.servico.findMany.mockResolvedValue([
      { id: "servico-inativo", ativo: false },
      { id: "servico-2", ativo: true },
    ]);

    const resposta = await chamarPatch({ itemOrdemServicoId: ITEM_ID, servicos: novos });

    expect(resposta.status).toBe(200);
    expect(dadosDoUpdateDaOrdem().valorTotal).toBe(125);
  });
});
