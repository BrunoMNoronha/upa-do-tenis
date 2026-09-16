import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizarPaginacao } from "@/lib/paginacao";
import { listarClientesPaginado } from "@/lib/clientes";
import { listarServicosParaGestaoPaginado } from "@/lib/servicos";
import { listarProdutosPaginado } from "@/lib/produtos";
import { listarInsumosPaginado } from "@/lib/insumos";
import { listarCaixasPaginado } from "@/lib/caixa";

const { prismaMock, estoqueMinimoRef } = vi.hoisted(() => {
  const estoqueMinimoRef = { __ref: "insumo.estoqueMinimo" };
  const modelo = () => ({ findMany: vi.fn(), count: vi.fn() });
  return {
    estoqueMinimoRef,
    prismaMock: {
      cliente: modelo(),
      servico: modelo(),
      produto: modelo(),
      insumo: { ...modelo(), fields: { estoqueMinimo: estoqueMinimoRef } },
      caixa: modelo(),
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

describe("listagens paginadas: count e findMany compartilham o mesmo where", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clientes: busca por nome/telefone + paginação, ordem determinística", async () => {
    prismaMock.cliente.count.mockResolvedValue(25);
    prismaMock.cliente.findMany.mockResolvedValue([{ id: "c1" }]);

    const resultado = await listarClientesPaginado({
      search: "João 123",
      paginacao: normalizarPaginacao({ page: 2, pageSize: 10 }),
    });

    const { whereCount, find } = argumentos(prismaMock.cliente);
    expect(whereCount).toEqual({
      OR: [{ nome: { contains: "João 123" } }, { telefone: { contains: "123" } }],
    });
    expect(find.where).toEqual(whereCount);
    expect(find).toMatchObject({ skip: 10, take: 10 });
    expect(find.orderBy).toEqual([{ criadoEm: "desc" }, { nome: "asc" }, { id: "desc" }]);
    expect(resultado.pagination).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 });
    expect(resultado.data).toEqual([{ id: "c1" }]);
  });

  it("clientes: sem busca usa where vazio e primeira página", async () => {
    prismaMock.cliente.count.mockResolvedValue(0);
    prismaMock.cliente.findMany.mockResolvedValue([]);

    const resultado = await listarClientesPaginado({ paginacao: normalizarPaginacao({}) });

    expect(prismaMock.cliente.count).toHaveBeenCalledWith({ where: {} });
    expect(prismaMock.cliente.findMany.mock.calls[0][0]).toMatchObject({ where: {}, skip: 0, take: 20 });
    expect(resultado.pagination).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });

  it("serviços (gestão): inclui inativos, ordena por nome e id", async () => {
    prismaMock.servico.count.mockResolvedValue(3);
    prismaMock.servico.findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }, { id: "s3" }]);

    const resultado = await listarServicosParaGestaoPaginado({ paginacao: normalizarPaginacao({ pageSize: 50 }) });

    const { whereCount, find } = argumentos(prismaMock.servico);
    expect(whereCount).toEqual({});
    expect(find).toMatchObject({ where: {}, skip: 0, take: 50, orderBy: [{ nome: "asc" }, { id: "asc" }] });
    expect(resultado.pagination).toEqual({ page: 1, pageSize: 50, total: 3, totalPages: 1 });
  });

  it("produtos: última página traz o restante", async () => {
    prismaMock.produto.count.mockResolvedValue(21);
    prismaMock.produto.findMany.mockResolvedValue([{ id: "p21" }]);

    const resultado = await listarProdutosPaginado({ paginacao: normalizarPaginacao({ page: 2, pageSize: 20 }) });

    expect(prismaMock.produto.findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 20, orderBy: [{ nome: "asc" }, { id: "asc" }] });
    expect(resultado.pagination).toEqual({ page: 2, pageSize: 20, total: 21, totalPages: 2 });
    expect(resultado.data).toEqual([{ id: "p21" }]);
  });

  it("insumos: filtro de estoque baixo aplicado igualmente no count e na página", async () => {
    prismaMock.insumo.count.mockResolvedValue(2);
    prismaMock.insumo.findMany.mockResolvedValue([{ id: "i1" }, { id: "i2" }]);

    await listarInsumosPaginado({ estoqueBaixo: true, paginacao: normalizarPaginacao({}) });

    const { whereCount, find } = argumentos(prismaMock.insumo);
    expect(whereCount).toEqual({ quantidadeEstoque: { lte: estoqueMinimoRef } });
    expect(find.where).toEqual(whereCount);
    expect(find.orderBy).toEqual([{ nome: "asc" }, { id: "asc" }]);
  });

  it("insumos: sem filtro usa where indefinido nos dois lados", async () => {
    prismaMock.insumo.count.mockResolvedValue(0);
    prismaMock.insumo.findMany.mockResolvedValue([]);

    await listarInsumosPaginado({ paginacao: normalizarPaginacao({}) });

    expect(prismaMock.insumo.count).toHaveBeenCalledWith({ where: undefined });
    expect(prismaMock.insumo.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  it("caixas: filtro de período + paginação, valores decimais normalizados", async () => {
    prismaMock.caixa.count.mockResolvedValue(1);
    prismaMock.caixa.findMany.mockResolvedValue([
      { id: "cx1", saldoInicial: 100, dataAbertura: new Date("2026-09-01T10:00:00.000Z"), status: "FECHADO" },
    ]);

    const resultado = await listarCaixasPaginado({
      dataInicio: "2026-09-01",
      dataFim: "2026-09-30",
      paginacao: normalizarPaginacao({ page: 1, pageSize: 10 }),
    });

    const { whereCount, find } = argumentos(prismaMock.caixa);
    expect(whereCount).toEqual({
      dataAbertura: { gte: new Date("2026-09-01T00:00:00"), lte: new Date("2026-09-30T23:59:59") },
    });
    expect(find.where).toEqual(whereCount);
    expect(find).toMatchObject({ skip: 0, take: 10, orderBy: [{ dataAbertura: "desc" }, { id: "desc" }] });
    expect(resultado.pagination).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
    expect(resultado.data[0]).toMatchObject({ id: "cx1", saldoInicial: 100, dataAbertura: "2026-09-01T10:00:00.000Z" });
  });

  it("caixas: período incompleto não filtra (mesma regra da listagem anterior)", async () => {
    prismaMock.caixa.count.mockResolvedValue(0);
    prismaMock.caixa.findMany.mockResolvedValue([]);

    await listarCaixasPaginado({ dataInicio: "2026-09-01", paginacao: normalizarPaginacao({}) });

    expect(prismaMock.caixa.count).toHaveBeenCalledWith({ where: {} });
  });
});
