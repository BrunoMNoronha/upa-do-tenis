import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanearTipoFormaPagamentoDinheiro } from "./formas-pagamento";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    formaPagamento: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("sanearTipoFormaPagamentoDinheiro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("corrige a forma 'Dinheiro' com tipo vazio para DINHEIRO (reproduz o achado da Fatia 13.3)", async () => {
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([
      { id: "forma-1", nome: "Dinheiro", tipo: "" },
    ] as any);
    vi.mocked(prisma.formaPagamento.update).mockResolvedValue({} as any);

    const resultado = await sanearTipoFormaPagamentoDinheiro();

    expect(prisma.formaPagamento.update).toHaveBeenCalledWith({
      where: { id: "forma-1" },
      data: { tipo: "DINHEIRO" },
    });
    expect(resultado.totalAnalisadas).toBe(1);
    expect(resultado.totalCorrigidas).toBe(1);
    expect(resultado.idsCorrigidos).toEqual(["forma-1"]);
  });

  it("corrige a forma 'Dinheiro' com tipo nulo para DINHEIRO", async () => {
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([
      { id: "forma-1", nome: "Dinheiro", tipo: null },
    ] as any);
    vi.mocked(prisma.formaPagamento.update).mockResolvedValue({} as any);

    const resultado = await sanearTipoFormaPagamentoDinheiro();

    expect(resultado.totalCorrigidas).toBe(1);
  });

  it("não altera a forma 'Dinheiro' que já possui tipo DINHEIRO (idempotente)", async () => {
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([
      { id: "forma-1", nome: "Dinheiro", tipo: "DINHEIRO" },
    ] as any);

    const resultado = await sanearTipoFormaPagamentoDinheiro();

    expect(prisma.formaPagamento.update).not.toHaveBeenCalled();
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
    expect(prisma.formaPagamento.update).not.toHaveBeenCalled();
  });
});
