import { beforeEach, describe, expect, it, vi } from "vitest";

import { lerBuscaDeSearchParams, montarCondicaoBusca, normalizarTermoBusca } from "@/lib/busca-listagem";
import { normalizarPaginacao } from "@/lib/paginacao";
import { listarServicosParaGestaoPaginado } from "@/lib/servicos";
import { listarProdutosPaginado } from "@/lib/produtos";
import { listarInsumosPaginado } from "@/lib/insumos";

const { prismaMock, estoqueMinimoRef } = vi.hoisted(() => {
  const estoqueMinimoRef = { __ref: "insumo.estoqueMinimo" };
  const modelo = () => ({ findMany: vi.fn(), count: vi.fn() });
  return {
    estoqueMinimoRef,
    prismaMock: {
      servico: modelo(),
      produto: modelo(),
      insumo: { ...modelo(), fields: { estoqueMinimo: estoqueMinimoRef } },
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

type Modelo = { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };

function argumentos(modelo: Modelo) {
  return {
    whereCount: modelo.count.mock.calls[0][0].where,
    find: modelo.findMany.mock.calls[0][0],
  };
}

const contains = (campo: string, termo: string) => ({ [campo]: { contains: termo, mode: "insensitive" } });

describe("normalização do termo de busca", () => {
  it("remove espaços nas extremidades e trata vazio/nulo", () => {
    expect(normalizarTermoBusca("  Cola  ")).toBe("Cola");
    expect(normalizarTermoBusca("   ")).toBe("");
    expect(normalizarTermoBusca(null)).toBe("");
    expect(normalizarTermoBusca(undefined)).toBe("");
  });

  it("lê `busca` de URLSearchParams e de objeto de página", () => {
    expect(lerBuscaDeSearchParams(new URLSearchParams("busca=%20sola%20"))).toBe("sola");
    expect(lerBuscaDeSearchParams({ busca: " sola " })).toBe("sola");
    expect(lerBuscaDeSearchParams({ busca: ["a", "b"] })).toBe("");
    expect(lerBuscaDeSearchParams({})).toBe("");
  });
});

describe("montarCondicaoBusca", () => {
  it("retorna undefined sem termo ou sem campos", () => {
    expect(montarCondicaoBusca("", ["nome"])).toBeUndefined();
    expect(montarCondicaoBusca("   ", ["nome"])).toBeUndefined();
    expect(montarCondicaoBusca("x", [])).toBeUndefined();
  });

  it("gera OR case-insensitive por campo, com termo aparado", () => {
    expect(montarCondicaoBusca(" Tênis ", ["nome", "descricao"])).toEqual({
      OR: [contains("nome", "Tênis"), contains("descricao", "Tênis")],
    });
  });

  it("não interpreta caracteres especiais (contains literal)", () => {
    expect(montarCondicaoBusca("(.*)%_", ["nome"])).toEqual({ OR: [contains("nome", "(.*)%_")] });
  });
});

describe("listagens paginadas com busca: termo entra no where antes da paginação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serviços: busca por nome/descrição no count e no findMany, página respeitada", async () => {
    prismaMock.servico.count.mockResolvedValue(30);
    prismaMock.servico.findMany.mockResolvedValue([{ id: "s1" }]);

    const resultado = await listarServicosParaGestaoPaginado({
      busca: "  troca ",
      paginacao: normalizarPaginacao({ page: 2, pageSize: 10 }),
    });

    const { whereCount, find } = argumentos(prismaMock.servico);
    expect(whereCount).toEqual({ OR: [contains("nome", "troca"), contains("descricao", "troca")] });
    expect(find.where).toEqual(whereCount);
    expect(find).toMatchObject({ skip: 10, take: 10, orderBy: [{ nome: "asc" }, { id: "asc" }] });
    expect(resultado.pagination).toEqual({ page: 2, pageSize: 10, total: 30, totalPages: 3 });
  });

  it("serviços: sem termo mantém where vazio (regressão)", async () => {
    prismaMock.servico.count.mockResolvedValue(0);
    prismaMock.servico.findMany.mockResolvedValue([]);

    await listarServicosParaGestaoPaginado({ busca: "   ", paginacao: normalizarPaginacao({}) });

    expect(prismaMock.servico.count).toHaveBeenCalledWith({ where: {} });
    expect(prismaMock.servico.findMany.mock.calls[0][0].where).toEqual({});
  });

  it("produtos: busca por nome/descrição", async () => {
    prismaMock.produto.count.mockResolvedValue(1);
    prismaMock.produto.findMany.mockResolvedValue([{ id: "p1" }]);

    await listarProdutosPaginado({ busca: "Cadarço", paginacao: normalizarPaginacao({}) });

    const { whereCount, find } = argumentos(prismaMock.produto);
    expect(whereCount).toEqual({ OR: [contains("nome", "Cadarço"), contains("descricao", "Cadarço")] });
    expect(find.where).toEqual(whereCount);
  });

  it("produtos: sem termo mantém where vazio (regressão)", async () => {
    prismaMock.produto.count.mockResolvedValue(0);
    prismaMock.produto.findMany.mockResolvedValue([]);

    await listarProdutosPaginado({ paginacao: normalizarPaginacao({}) });

    expect(prismaMock.produto.count).toHaveBeenCalledWith({ where: {} });
  });

  it("insumos: busca combina com o filtro de estoque baixo via AND", async () => {
    prismaMock.insumo.count.mockResolvedValue(1);
    prismaMock.insumo.findMany.mockResolvedValue([{ id: "i1" }]);

    await listarInsumosPaginado({ estoqueBaixo: true, busca: "cola", paginacao: normalizarPaginacao({}) });

    const { whereCount, find } = argumentos(prismaMock.insumo);
    expect(whereCount).toEqual({
      AND: [
        { quantidadeEstoque: { lte: estoqueMinimoRef } },
        { OR: [contains("nome", "cola"), contains("descricao", "cola"), contains("unidadeMedida", "cola")] },
      ],
    });
    expect(find.where).toEqual(whereCount);
  });

  it("insumos: só busca, sem alerta", async () => {
    prismaMock.insumo.count.mockResolvedValue(0);
    prismaMock.insumo.findMany.mockResolvedValue([]);

    await listarInsumosPaginado({ busca: "ml", paginacao: normalizarPaginacao({}) });

    const { whereCount } = argumentos(prismaMock.insumo);
    expect(whereCount).toEqual({
      OR: [contains("nome", "ml"), contains("descricao", "ml"), contains("unidadeMedida", "ml")],
    });
  });

  it("insumos: sem termo e sem alerta mantém where indefinido (regressão)", async () => {
    prismaMock.insumo.count.mockResolvedValue(0);
    prismaMock.insumo.findMany.mockResolvedValue([]);

    await listarInsumosPaginado({ busca: "", paginacao: normalizarPaginacao({}) });

    expect(prismaMock.insumo.count).toHaveBeenCalledWith({ where: undefined });
  });
});
