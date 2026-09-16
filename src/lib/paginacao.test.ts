import { describe, expect, it, vi } from "vitest";

import {
  PAGE_SIZE_MAXIMO,
  PAGE_SIZE_PADRAO,
  calcularTotalPaginas,
  lerPaginacaoDeSearchParams,
  montarPaginacaoInfo,
  montarQueryPagina,
  normalizarPaginacao,
  paginarConsulta,
  resetarPagina,
} from "./paginacao";

describe("normalizarPaginacao", () => {
  it("usa padrões quando nada é informado", () => {
    expect(normalizarPaginacao()).toEqual({ page: 1, pageSize: PAGE_SIZE_PADRAO, skip: 0, take: PAGE_SIZE_PADRAO });
    expect(normalizarPaginacao({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it("calcula skip como (page - 1) * pageSize", () => {
    expect(normalizarPaginacao({ page: 1, pageSize: 20 }).skip).toBe(0);
    expect(normalizarPaginacao({ page: 3, pageSize: 20 }).skip).toBe(40);
    expect(normalizarPaginacao({ page: "2", pageSize: "50" })).toEqual({ page: 2, pageSize: 50, skip: 50, take: 50 });
  });

  it.each([
    ["0", 1],
    ["-1", 1],
    ["abc", 1],
    ["1.5", 1],
    ["", 1],
    [null, 1],
    [undefined, 1],
  ])("page inválida %j cai para %i", (entrada, esperado) => {
    expect(normalizarPaginacao({ page: entrada }).page).toBe(esperado);
  });

  it.each([
    ["0", PAGE_SIZE_PADRAO],
    ["-5", PAGE_SIZE_PADRAO],
    ["xyz", PAGE_SIZE_PADRAO],
    ["2.5", PAGE_SIZE_PADRAO],
    ["", PAGE_SIZE_PADRAO],
    [null, PAGE_SIZE_PADRAO],
  ])("pageSize inválido %j cai para o padrão", (entrada, esperado) => {
    expect(normalizarPaginacao({ pageSize: entrada }).pageSize).toBe(esperado);
  });

  it("limita pageSize ao máximo permitido", () => {
    expect(normalizarPaginacao({ pageSize: 100 }).pageSize).toBe(100);
    expect(normalizarPaginacao({ pageSize: 101 }).pageSize).toBe(PAGE_SIZE_MAXIMO);
    expect(normalizarPaginacao({ pageSize: "999999" }).pageSize).toBe(PAGE_SIZE_MAXIMO);
  });
});

describe("lerPaginacaoDeSearchParams", () => {
  it("lê de URLSearchParams", () => {
    const params = new URLSearchParams("page=4&pageSize=10&busca=cliente");
    expect(lerPaginacaoDeSearchParams(params)).toEqual({ page: 4, pageSize: 10, skip: 30, take: 10 });
  });

  it("lê de objeto de searchParams do App Router e ignora arrays", () => {
    expect(lerPaginacaoDeSearchParams({ page: "2", pageSize: ["50"] })).toEqual({
      page: 2,
      pageSize: PAGE_SIZE_PADRAO,
      skip: 20,
      take: 20,
    });
  });
});

describe("calcularTotalPaginas e montarPaginacaoInfo", () => {
  it("retorna pelo menos 1 página, mesmo sem registros", () => {
    expect(calcularTotalPaginas(0, 20)).toBe(1);
    expect(calcularTotalPaginas(20, 20)).toBe(1);
    expect(calcularTotalPaginas(21, 20)).toBe(2);
    expect(calcularTotalPaginas(100, 20)).toBe(5);
  });

  it("monta o objeto de paginação com total e totalPages", () => {
    expect(montarPaginacaoInfo({ page: 2, pageSize: 20, total: 45 })).toEqual({
      page: 2,
      pageSize: 20,
      total: 45,
      totalPages: 3,
    });
  });
});

describe("paginarConsulta", () => {
  const registros = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }));
  const contar = vi.fn(async () => registros.length);
  const buscar = vi.fn(async ({ skip, take }: { skip: number; take: number }) => registros.slice(skip, skip + take));

  it("primeira página", async () => {
    const resultado = await paginarConsulta({ paginacao: normalizarPaginacao({ page: 1, pageSize: 20 }), contar, buscar });
    expect(resultado.data.map((r) => r.id)).toEqual(registros.slice(0, 20).map((r) => r.id));
    expect(resultado.pagination).toEqual({ page: 1, pageSize: 20, total: 45, totalPages: 3 });
  });

  it("página intermediária", async () => {
    const resultado = await paginarConsulta({ paginacao: normalizarPaginacao({ page: 2, pageSize: 20 }), contar, buscar });
    expect(resultado.data[0].id).toBe(21);
    expect(resultado.data).toHaveLength(20);
    expect(resultado.pagination.page).toBe(2);
  });

  it("última página traz apenas o restante", async () => {
    const resultado = await paginarConsulta({ paginacao: normalizarPaginacao({ page: 3, pageSize: 20 }), contar, buscar });
    expect(resultado.data.map((r) => r.id)).toEqual([41, 42, 43, 44, 45]);
    expect(resultado.pagination.totalPages).toBe(3);
  });

  it("página além da última cai para a última página válida", async () => {
    buscar.mockClear();
    const resultado = await paginarConsulta({ paginacao: normalizarPaginacao({ page: 9, pageSize: 20 }), contar, buscar });
    expect(resultado.pagination.page).toBe(3);
    expect(resultado.data.map((r) => r.id)).toEqual([41, 42, 43, 44, 45]);
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(buscar).toHaveBeenLastCalledWith({ skip: 40, take: 20 });
  });

  it("lista vazia mantém page 1 e totalPages 1", async () => {
    const resultado = await paginarConsulta({
      paginacao: normalizarPaginacao({ page: 3 }),
      contar: async () => 0,
      buscar: async () => [],
    });
    expect(resultado).toEqual({ data: [], pagination: { page: 3, pageSize: 20, total: 0, totalPages: 1 } });
  });
});

describe("montarQueryPagina e resetarPagina", () => {
  it("preserva filtros e busca ao trocar de página", () => {
    expect(montarQueryPagina("status=ABERTA&busca=cliente", { page: 2 })).toBe("status=ABERTA&busca=cliente&page=2");
  });

  it("omite page=1 e pageSize padrão", () => {
    expect(montarQueryPagina("page=3&pageSize=20&busca=x", { page: 1, pageSize: 20 })).toBe("busca=x");
  });

  it("grava pageSize fora do padrão e limita ao máximo", () => {
    expect(montarQueryPagina("", { page: 2, pageSize: 50 })).toBe("pageSize=50&page=2");
    expect(montarQueryPagina("", { page: 1, pageSize: 500 })).toBe("pageSize=100");
  });

  it("resetarPagina remove page e mantém filtros e pageSize", () => {
    expect(resetarPagina("page=4&pageSize=50&status=ABERTA").toString()).toBe("pageSize=50&status=ABERTA");
  });
});
