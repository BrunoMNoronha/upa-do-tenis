import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanearTipoFormaPagamentoDinheiro } from "./formas-pagamento";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    formaPagamento: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe("sanearTipoFormaPagamentoDinheiro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("corrige a forma 'Dinheiro' com tipo vazio para DINHEIRO via updateMany (reproduz o achado da Fatia 13.3)", async () => {
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([
      { id: "forma-1", nome: "Dinheiro", tipo: "" },
    ] as any);
    vi.mocked(prisma.formaPagamento.updateMany).mockResolvedValue({ count: 1 } as any);

    const resultado = await sanearTipoFormaPagamentoDinheiro();

    expect(prisma.formaPagamento.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["forma-1"] } },
      data: { tipo: "DINHEIRO" },
    });
    expect(resultado.totalAnalisadas).toBe(1);
    expect(resultado.totalCorrigidas).toBe(1);
    expect(resultado.idsCorrigidos).toEqual(["forma-1"]);
  });

  it("corrige múltiplas formas 'Dinheiro' em lote (batch) com uma única chamada updateMany", async () => {
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([
      { id: "forma-1", nome: "Dinheiro", tipo: "" },
      { id: "forma-2", nome: "dinheiro", tipo: null },
      { id: "forma-3", nome: "DINHEIRO", tipo: "   " },
    ] as any);
    vi.mocked(prisma.formaPagamento.updateMany).mockResolvedValue({ count: 3 } as any);

    const resultado = await sanearTipoFormaPagamentoDinheiro();

    expect(prisma.formaPagamento.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.formaPagamento.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["forma-1", "forma-2", "forma-3"] } },
      data: { tipo: "DINHEIRO" },
    });
    expect(resultado.totalAnalisadas).toBe(3);
    expect(resultado.totalCorrigidas).toBe(3);
    expect(resultado.idsCorrigidos).toEqual(["forma-1", "forma-2", "forma-3"]);
  });

  it("corrige a forma 'Dinheiro' com tipo nulo para DINHEIRO", async () => {
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([
      { id: "forma-1", nome: "Dinheiro", tipo: null },
    ] as any);
    vi.mocked(prisma.formaPagamento.updateMany).mockResolvedValue({ count: 1 } as any);

    const resultado = await sanearTipoFormaPagamentoDinheiro();

    expect(resultado.totalCorrigidas).toBe(1);
  });

  it("não altera a forma 'Dinheiro' que já possui tipo DINHEIRO (idempotente)", async () => {
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([
      { id: "forma-1", nome: "Dinheiro", tipo: "DINHEIRO" },
    ] as any);

    const resultado = await sanearTipoFormaPagamentoDinheiro();

    expect(prisma.formaPagamento.updateMany).not.toHaveBeenCalled();
    expect(resultado.totalCorrigidas).toBe(0);
  });

  it("não altera formas ambíguas com nome diferente de 'Dinheiro' (ex.: 'Dinheiro Físico')", async () => {
    // A query já filtra por nome exato "Dinheiro" (case-insensitive) no banco;
    // este teste documenta que o filtro não deve trazer nomes parecidos.
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([] as any);

    const resultado = await sanearTipoFormaPagamentoDinheiro();

    expect(prisma.formaPagamento.findMany).toHaveBeenCalledWith({
      where: { nome: { equals: "Dinheiro", mode: "insensitive" } },
      select: { id: true, nome: true, tipo: true },
    });
    expect(resultado.totalCorrigidas).toBe(0);
    expect(prisma.formaPagamento.updateMany).not.toHaveBeenCalled();
  });
});
