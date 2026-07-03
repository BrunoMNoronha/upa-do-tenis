import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InsumoItemOrdemServicoError,
  registrarInsumoItemOrdemServico,
} from "@/lib/ordens-servico-insumos";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    ordemServico: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    itemOrdemServico: {
      findFirst: vi.fn(),
    },
    insumo: {
      findUnique: vi.fn(),
    },
    insumoItemOrdem: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("ordens-servico-insumos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registra insumo válido e calcula custo total corretamente", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce({
      id: "os-1",
      valorTotal: new Prisma.Decimal(150),
      valorPago: new Prisma.Decimal(20),
      saldo: new Prisma.Decimal(130),
    });
    prismaMock.itemOrdemServico.findFirst.mockResolvedValueOnce({ id: "item-1" });
    prismaMock.insumo.findUnique.mockResolvedValueOnce({ id: "ins-1" });
    prismaMock.insumoItemOrdem.create.mockResolvedValueOnce({
      id: "ins-item-1",
      quantidade: new Prisma.Decimal(2),
      custoUnitarioAplicado: new Prisma.Decimal(3.5),
      custoTotalAplicado: new Prisma.Decimal(7),
      insumo: { id: "ins-1", nome: "Cola", unidadeMedida: "ml" },
      itemOrdemServico: { id: "item-1", descricao: "Tenis" },
    });

    const resultado = await registrarInsumoItemOrdemServico("os-1", {
      itemOrdemServicoId: "item-1",
      insumoId: "ins-1",
      quantidade: 2,
      custoUnitarioAplicado: 3.5,
      observacoes: "Aplicado na sola",
    });

    expect(prismaMock.insumoItemOrdem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itemOrdemServicoId: "item-1",
          insumoId: "ins-1",
          quantidade: 2,
          custoUnitarioAplicado: 3.5,
          custoTotalAplicado: 7,
        }),
      }),
    );
    expect(resultado.insumoAplicado.custoTotalAplicado).toBe(7);
  });

  it("falha para OS inexistente", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce(null);

    await expect(
      registrarInsumoItemOrdemServico("os-inexistente", {
        itemOrdemServicoId: "item-1",
        insumoId: "ins-1",
        quantidade: 1,
        custoUnitarioAplicado: 1,
      }),
    ).rejects.toMatchObject<InsumoItemOrdemServicoError>({
      message: "Ordem de serviço não encontrada.",
      status: 404,
    });
  });

  it("falha para item inexistente", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce({
      id: "os-1",
      valorTotal: new Prisma.Decimal(150),
      valorPago: new Prisma.Decimal(20),
      saldo: new Prisma.Decimal(130),
    });
    prismaMock.itemOrdemServico.findFirst.mockResolvedValueOnce(null);

    await expect(
      registrarInsumoItemOrdemServico("os-1", {
        itemOrdemServicoId: "item-inexistente",
        insumoId: "ins-1",
        quantidade: 1,
        custoUnitarioAplicado: 1,
      }),
    ).rejects.toMatchObject<InsumoItemOrdemServicoError>({
      message: "Item da ordem de serviço não encontrado.",
      status: 404,
    });
  });

  it("falha para insumo inexistente", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce({
      id: "os-1",
      valorTotal: new Prisma.Decimal(150),
      valorPago: new Prisma.Decimal(20),
      saldo: new Prisma.Decimal(130),
    });
    prismaMock.itemOrdemServico.findFirst.mockResolvedValueOnce({ id: "item-1" });
    prismaMock.insumo.findUnique.mockResolvedValueOnce(null);

    await expect(
      registrarInsumoItemOrdemServico("os-1", {
        itemOrdemServicoId: "item-1",
        insumoId: "ins-inexistente",
        quantidade: 1,
        custoUnitarioAplicado: 1,
      }),
    ).rejects.toMatchObject<InsumoItemOrdemServicoError>({
      message: "Insumo não encontrado.",
      status: 404,
    });
  });

  it("falha para quantidade inválida", async () => {
    await expect(
      registrarInsumoItemOrdemServico("os-1", {
        itemOrdemServicoId: "item-1",
        insumoId: "ins-1",
        quantidade: -1,
        custoUnitarioAplicado: 1,
      }),
    ).rejects.toMatchObject<InsumoItemOrdemServicoError>({
      message: "A quantidade deve ser maior que zero.",
      status: 400,
    });
  });

  it("não altera valorTotal, valorPago e saldo da OS ao registrar insumo", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce({
      id: "os-1",
      valorTotal: new Prisma.Decimal(150),
      valorPago: new Prisma.Decimal(20),
      saldo: new Prisma.Decimal(130),
    });
    prismaMock.itemOrdemServico.findFirst.mockResolvedValueOnce({ id: "item-1" });
    prismaMock.insumo.findUnique.mockResolvedValueOnce({ id: "ins-1" });
    prismaMock.insumoItemOrdem.create.mockResolvedValueOnce({
      id: "ins-item-2",
      quantidade: new Prisma.Decimal(1),
      custoUnitarioAplicado: new Prisma.Decimal(2),
      custoTotalAplicado: new Prisma.Decimal(2),
      insumo: { id: "ins-1", nome: "Cola", unidadeMedida: "ml" },
      itemOrdemServico: { id: "item-1", descricao: "Tenis" },
    });

    const resultado = await registrarInsumoItemOrdemServico("os-1", {
      itemOrdemServicoId: "item-1",
      insumoId: "ins-1",
      quantidade: 1,
      custoUnitarioAplicado: 2,
    });

    expect(resultado.ordemServico.valorTotal).toBe(150);
    expect(resultado.ordemServico.valorPago).toBe(20);
    expect(resultado.ordemServico.saldo).toBe(130);
    expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
  });
});