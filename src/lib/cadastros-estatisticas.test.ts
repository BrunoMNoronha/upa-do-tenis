import { beforeEach, describe, expect, it, vi } from "vitest";

import { contarEstatisticasClientes } from "@/lib/clientes";
import { contarEstatisticasServicos } from "@/lib/servicos";
import { contarEstatisticasProdutos } from "@/lib/produtos";
import { somarValorEstoque } from "@/lib/valor-estoque";
import { contarEstatisticasInsumos } from "@/lib/insumos";

const { prismaMock, estoqueMinimoRef } = vi.hoisted(() => {
  const estoqueMinimoRef = { __ref: "insumo.estoqueMinimo" };
  const modelo = () => ({ findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() });
  return {
    estoqueMinimoRef,
    prismaMock: {
      cliente: modelo(),
      servico: modelo(),
      produto: modelo(),
      insumo: { ...modelo(), fields: { estoqueMinimo: estoqueMinimoRef } },
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

function wheres(count: ReturnType<typeof vi.fn>) {
  return count.mock.calls.map((chamada) => chamada[0]?.where);
}

describe("contadores das telas de cadastro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clientes: total, ativos, inativos derivado e novos desde o dia 1 do mês operacional", async () => {
    prismaMock.cliente.count.mockResolvedValueOnce(412).mockResolvedValueOnce(398).mockResolvedValueOnce(23);

    const resultado = await contarEstatisticasClientes(new Date("2026-09-16T12:00:00.000Z"));

    expect(resultado).toEqual({ total: 412, ativos: 398, inativos: 14, novosNoMes: 23 });
    expect(wheres(prismaMock.cliente.count)).toEqual([
      undefined,
      { ativo: true },
      { criadoEm: { gte: new Date("2026-09-01T03:00:00.000Z") } },
    ]);
  });

  it("serviços: preço médio só entre ativos, nulo sem ativos", async () => {
    prismaMock.servico.count.mockResolvedValueOnce(18).mockResolvedValueOnce(16);
    prismaMock.servico.aggregate.mockResolvedValueOnce({ _avg: { precoBase: "48.6" } });

    expect(await contarEstatisticasServicos()).toEqual({ total: 18, ativos: 16, inativos: 2, precoMedioAtivos: 48.6 });
    expect(prismaMock.servico.aggregate).toHaveBeenCalledWith({ where: { ativo: true }, _avg: { precoBase: true } });

    prismaMock.servico.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prismaMock.servico.aggregate.mockResolvedValueOnce({ _avg: { precoBase: null } });
    expect((await contarEstatisticasServicos()).precoMedioAtivos).toBeNull();
  });

  it("produtos: sem estoque entre ativos e valor a preço de venda", async () => {
    prismaMock.produto.count.mockResolvedValueOnce(14).mockResolvedValueOnce(13).mockResolvedValueOnce(1);
    prismaMock.produto.findMany.mockResolvedValueOnce([
      { precoVenda: "19.90", quantidadeEstoque: "3" },
      { precoVenda: "5", quantidadeEstoque: "0" },
      { precoVenda: "0.10", quantidadeEstoque: "3" },
    ]);

    const resultado = await contarEstatisticasProdutos();

    expect(resultado).toEqual({ total: 14, ativos: 13, semEstoque: 1, valorEstoqueVenda: 60 });
    expect(wheres(prismaMock.produto.count)[2]).toEqual({ ativo: true, quantidadeEstoque: { lte: 0 } });
    expect(prismaMock.produto.findMany).toHaveBeenCalledWith({
      where: { ativo: true },
      select: { precoVenda: true, quantidadeEstoque: true },
    });
  });

  it("insumos: abaixo do mínimo usa a mesma regra do filtro e custo em estoque dos ativos", async () => {
    prismaMock.insumo.count.mockResolvedValueOnce(26).mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    prismaMock.insumo.findMany.mockResolvedValueOnce([
      { custoUnitario: "0.06", quantidadeEstoque: "480" },
      { custoUnitario: "18", quantidadeEstoque: "4" },
    ]);

    const resultado = await contarEstatisticasInsumos();

    expect(resultado).toEqual({ total: 26, abaixoDoMinimo: 3, zerados: 1, custoEstoque: 100.8 });
    expect(wheres(prismaMock.insumo.count)).toEqual([
      undefined,
      { quantidadeEstoque: { lte: estoqueMinimoRef } },
      { quantidadeEstoque: { lte: 0 } },
    ]);
  });
});

describe("somarValorEstoque", () => {
  it("arredonda para centavos e aceita quantidades fracionadas", () => {
    expect(somarValorEstoque([{ preco: "0.1", quantidade: "3" }])).toBe(0.3);
    expect(somarValorEstoque([{ preco: "2.5", quantidade: "1.5" }, { preco: "1", quantidade: "0" }])).toBe(3.75);
    expect(somarValorEstoque([])).toBe(0);
  });
});
