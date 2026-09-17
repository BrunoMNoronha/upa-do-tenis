import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PagamentoOrdemServicoError,
  registrarPagamentoOrdemServico,
} from "@/lib/ordens-servico-pagamentos";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

function criarOSBase(params?: {
  valorTotal?: number;
  valorPago?: number;
  pagamentos?: Array<{ valor: number }>;
}) {
  return {
    id: "os-1",
    status: "ABERTA",
    valorTotal: new Prisma.Decimal(params?.valorTotal ?? 100),
    valorDesconto: new Prisma.Decimal(0),
    valorSinal: new Prisma.Decimal(0),
    valorPago: new Prisma.Decimal(params?.valorPago ?? 0),
    saldo: new Prisma.Decimal((params?.valorTotal ?? 100) - (params?.valorPago ?? 0)),
    pagamentos: (params?.pagamentos ?? []).map((p) => ({ valor: new Prisma.Decimal(p.valor) })),
    itens: [],
  };
}

describe("ordens-servico-pagamentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registra pagamento parcial e atualiza valorPago/saldo", async () => {
    const osAntes = criarOSBase({ valorTotal: 100, pagamentos: [{ valor: 20 }] });
    const osDepois = criarOSBase({ valorTotal: 100, pagamentos: [{ valor: 20 }, { valor: 30 }] });

    const txPagamentoCreate = vi.fn().mockResolvedValueOnce({
      id: "pag-1",
      valor: new Prisma.Decimal(30),
      formaPagamento: { id: "fp-1", nome: "PIX" },
    });
    const txOrdemFindUnique = vi
      .fn()
      .mockResolvedValueOnce(osAntes)
      .mockResolvedValueOnce(osDepois)
      .mockResolvedValueOnce({ id: "os-1" });
    const txOrdemUpdateMany = vi.fn().mockResolvedValueOnce({ count: 1 });
    const txFormaFindUnique = vi.fn().mockResolvedValueOnce({ id: "fp-1" });

    prismaMock.$transaction.mockImplementationOnce(async (fn) =>
      fn({
        pagamento: {
          create: txPagamentoCreate,
        },
        ordemServico: {
          findUnique: txOrdemFindUnique,
          updateMany: txOrdemUpdateMany,
        },
        formaPagamento: {
          findUnique: txFormaFindUnique,
        },
        caixa: {
          findFirst: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          findUnique: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          update: vi.fn(),
        },
        movimentacaoCaixa: {
          create: vi.fn(),
        },
      }),
    );

    const resultado = await registrarPagamentoOrdemServico("os-1", {
      formaPagamentoId: "fp-1",
      valor: 30,
      dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txOrdemUpdateMany).toHaveBeenCalledWith({
      where: { id: "os-1", status: { not: "CANCELADA" } },
      data: {
        valorPago: 50,
        saldo: 50,
      },
    });
    expect(resultado.resumoFinanceiro.valorPago).toBe(50);
    expect(resultado.resumoFinanceiro.saldo).toBe(50);
  });

  it("registra pagamento total e zera saldo", async () => {
    const osAntes = criarOSBase({ valorTotal: 100, pagamentos: [{ valor: 40 }] });
    const osDepois = criarOSBase({ valorTotal: 100, pagamentos: [{ valor: 40 }, { valor: 60 }] });

    const txPagamentoCreate = vi.fn().mockResolvedValueOnce({
      id: "pag-2",
      valor: new Prisma.Decimal(60),
      formaPagamento: { id: "fp-2", nome: "Cartão" },
    });
    const txOrdemFindUnique = vi
      .fn()
      .mockResolvedValueOnce(osAntes)
      .mockResolvedValueOnce(osDepois)
      .mockResolvedValueOnce({ id: "os-1" });
    const txOrdemUpdateMany = vi.fn().mockResolvedValueOnce({ count: 1 });
    const txFormaFindUnique = vi.fn().mockResolvedValueOnce({ id: "fp-2" });

    prismaMock.$transaction.mockImplementationOnce(async (fn) =>
      fn({
        pagamento: {
          create: txPagamentoCreate,
        },
        ordemServico: {
          findUnique: txOrdemFindUnique,
          updateMany: txOrdemUpdateMany,
        },
        formaPagamento: {
          findUnique: txFormaFindUnique,
        },
        caixa: {
          findFirst: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          findUnique: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          update: vi.fn(),
        },
        movimentacaoCaixa: {
          create: vi.fn(),
        },
      }),
    );

    const resultado = await registrarPagamentoOrdemServico("os-1", {
      formaPagamentoId: "fp-2",
      valor: 60,
      dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
    });

    expect(resultado.resumoFinanceiro.valorPago).toBe(100);
    expect(resultado.resumoFinanceiro.saldo).toBe(0);
  });

  it("falha ao tentar registrar pagamento maior que saldo", async () => {
    const osAntes = criarOSBase({ valorTotal: 100, pagamentos: [{ valor: 80 }] });
    const txOrdemFindUnique = vi.fn().mockResolvedValueOnce(osAntes);
    const txFormaFindUnique = vi.fn().mockResolvedValueOnce({ id: "fp-1" });

    prismaMock.$transaction.mockImplementationOnce(async (fn) =>
      fn({
        pagamento: {
          create: vi.fn(),
        },
        ordemServico: {
          findUnique: txOrdemFindUnique,
          update: vi.fn(),
        },
        formaPagamento: {
          findUnique: txFormaFindUnique,
        },
        caixa: {
          findFirst: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          findUnique: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          update: vi.fn(),
        },
        movimentacaoCaixa: {
          create: vi.fn(),
        },
      }),
    );

    await expect(
      registrarPagamentoOrdemServico("os-1", {
        formaPagamentoId: "fp-1",
        valor: 30,
        dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      message: "Pagamento acima do saldo pendente não é permitido.",
      status: 400,
    });
  });

  it("falha com forma de pagamento inválida", async () => {
    const osAntes = criarOSBase({ valorTotal: 100 });
    const txOrdemFindUnique = vi.fn().mockResolvedValueOnce(osAntes);
    const txFormaFindUnique = vi.fn().mockResolvedValueOnce(null);

    prismaMock.$transaction.mockImplementationOnce(async (fn) =>
      fn({
        pagamento: {
          create: vi.fn(),
        },
        ordemServico: {
          findUnique: txOrdemFindUnique,
          update: vi.fn(),
        },
        formaPagamento: {
          findUnique: txFormaFindUnique,
        },
        caixa: {
          findFirst: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          findUnique: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          update: vi.fn(),
        },
        movimentacaoCaixa: {
          create: vi.fn(),
        },
      }),
    );

    await expect(
      registrarPagamentoOrdemServico("os-1", {
        formaPagamentoId: "inexistente",
        valor: 10,
        dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      message: "Forma de pagamento inválida.",
      status: 400,
    });
  });

  function txBase(overrides: Record<string, unknown> = {}) {
    return {
      pagamento: { create: vi.fn().mockResolvedValue({ id: "pag-x", valor: new Prisma.Decimal(10) }) },
      ordemServico: { findUnique: vi.fn(), updateMany: vi.fn() },
      formaPagamento: { findUnique: vi.fn().mockResolvedValue({ id: "fp-1" }) },
      caixa: {
        findFirst: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
        findUnique: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
        update: vi.fn(),
      },
      movimentacaoCaixa: { create: vi.fn() },
      ...overrides,
    };
  }

  it("recusa com 409 pagamento em OS cancelada, antes de criar qualquer registro (#229)", async () => {
    const tx = txBase();
    tx.ordemServico.findUnique.mockResolvedValueOnce({ ...criarOSBase({ valorTotal: 100 }), status: "CANCELADA" });
    prismaMock.$transaction.mockImplementationOnce(async (fn) => fn(tx));

    await expect(
      registrarPagamentoOrdemServico("os-1", {
        formaPagamentoId: "fp-1",
        valor: 10,
        dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ message: "Não é possível registrar pagamento em uma OS cancelada.", status: 409 });
    expect(tx.pagamento.create).not.toHaveBeenCalled();
    expect(tx.movimentacaoCaixa.create).not.toHaveBeenCalled();
  });

  it("falha com 409 (e desfaz a transação) quando a OS foi cancelada antes da gravação final (#229)", async () => {
    const tx = txBase();
    tx.ordemServico.findUnique
      .mockResolvedValueOnce(criarOSBase({ valorTotal: 100 }))
      .mockResolvedValueOnce(criarOSBase({ valorTotal: 100, pagamentos: [{ valor: 10 }] }));
    tx.ordemServico.updateMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.$transaction.mockImplementationOnce(async (fn) => fn(tx));

    await expect(
      registrarPagamentoOrdemServico("os-1", {
        formaPagamentoId: "fp-1",
        valor: 10,
        dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(PagamentoOrdemServicoError);
    expect(tx.ordemServico.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "os-1", status: { not: "CANCELADA" } } }),
    );
  });

  it("falha quando a OS não existe", async () => {
    const txOrdemFindUnique = vi.fn().mockResolvedValueOnce(null);

    prismaMock.$transaction.mockImplementationOnce(async (fn) =>
      fn({
        pagamento: {
          create: vi.fn(),
        },
        ordemServico: {
          findUnique: txOrdemFindUnique,
          update: vi.fn(),
        },
        formaPagamento: {
          findUnique: vi.fn(),
        },
        caixa: {
          findFirst: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          findUnique: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          update: vi.fn(),
        },
        movimentacaoCaixa: {
          create: vi.fn(),
        },
      }),
    );

    await expect(
      registrarPagamentoOrdemServico("os-inexistente", {
        formaPagamentoId: "fp-1",
        valor: 10,
        dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      message: "Ordem de serviço não encontrada.",
      status: 404,
    });
  });

  it("executa registro de pagamento dentro de transação prisma", async () => {
    const osAntes = criarOSBase({ valorTotal: 100, pagamentos: [{ valor: 10 }] });
    const osDepois = criarOSBase({ valorTotal: 100, pagamentos: [{ valor: 10 }, { valor: 20 }] });
    const txOrdemFindUnique = vi
      .fn()
      .mockResolvedValueOnce(osAntes)
      .mockResolvedValueOnce(osDepois)
      .mockResolvedValueOnce({ id: "os-1" });
    const txOrdemUpdateMany = vi.fn().mockResolvedValueOnce({ count: 1 });
    const txPagamentoCreate = vi.fn().mockResolvedValueOnce({
      id: "pag-10",
      valor: new Prisma.Decimal(20),
      formaPagamento: { id: "fp-1", nome: "PIX" },
    });

    prismaMock.$transaction.mockImplementationOnce(async (fn) =>
      fn({
        pagamento: { create: txPagamentoCreate },
        ordemServico: { findUnique: txOrdemFindUnique, updateMany: txOrdemUpdateMany },
        formaPagamento: { findUnique: vi.fn().mockResolvedValueOnce({ id: "fp-1" }) },
        caixa: { 
          findFirst: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          findUnique: vi.fn().mockResolvedValue({ id: "caixa-aberto", status: "ABERTO" }),
          update: vi.fn(),
        },
        movimentacaoCaixa: { create: vi.fn() },
      }),
    );

    await registrarPagamentoOrdemServico("os-1", {
      formaPagamentoId: "fp-1",
      valor: 20,
      dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txPagamentoCreate).toHaveBeenCalledTimes(1);
    expect(txOrdemUpdateMany).toHaveBeenCalledTimes(1);
  });
});