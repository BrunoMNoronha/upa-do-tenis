import { describe, expect, it } from "vitest";

import {
  inicioDoMesOperacional,
  lerFiltroEstoqueInsumos,
  lerFiltroEstoqueProdutos,
  lerFiltroStatus,
  statusParaAtivo,
} from "./cadastros-filtros";

describe("lerFiltroStatus / statusParaAtivo", () => {
  it("aceita apenas ativos e inativos", () => {
    expect(lerFiltroStatus({ status: "ativos" })).toBe("ativos");
    expect(lerFiltroStatus(new URLSearchParams("status=inativos"))).toBe("inativos");
    expect(lerFiltroStatus({ status: "todos" })).toBeUndefined();
    expect(lerFiltroStatus({})).toBeUndefined();
    expect(lerFiltroStatus({ status: ["ativos"] })).toBeUndefined();
  });

  it("converte o chip no campo ativo", () => {
    expect(statusParaAtivo("ativos")).toBe(true);
    expect(statusParaAtivo("inativos")).toBe(false);
    expect(statusParaAtivo(undefined)).toBeUndefined();
  });
});

describe("lerFiltroEstoqueProdutos", () => {
  it("reconhece só o valor sem", () => {
    expect(lerFiltroEstoqueProdutos({ estoque: "sem" })).toBe("sem");
    expect(lerFiltroEstoqueProdutos({ estoque: "baixo" })).toBeUndefined();
    expect(lerFiltroEstoqueProdutos({})).toBeUndefined();
  });
});

describe("lerFiltroEstoqueInsumos", () => {
  it("lê baixo e zerado", () => {
    expect(lerFiltroEstoqueInsumos({ estoque: "baixo" })).toBe("baixo");
    expect(lerFiltroEstoqueInsumos({ estoque: "zerado" })).toBe("zerado");
    expect(lerFiltroEstoqueInsumos({ estoque: "outro" })).toBeUndefined();
  });

  it("mantém os parâmetros legados do dashboard como estoque baixo", () => {
    expect(lerFiltroEstoqueInsumos({ alerta: "true" })).toBe("baixo");
    expect(lerFiltroEstoqueInsumos(new URLSearchParams("estoqueBaixo=true"))).toBe("baixo");
    expect(lerFiltroEstoqueInsumos({ alerta: "false" })).toBeUndefined();
  });
});

describe("inicioDoMesOperacional", () => {
  it("devolve a meia-noite do dia 1 em America/Sao_Paulo", () => {
    // 16/09/2026 12:00 UTC → setembro no fuso da operação; 1º de setembro 00:00 (-03:00).
    expect(inicioDoMesOperacional(new Date("2026-09-16T12:00:00.000Z"))).toEqual(new Date("2026-09-01T03:00:00.000Z"));
    // 01/10/2026 01:00 UTC ainda é 30/09 no fuso da operação.
    expect(inicioDoMesOperacional(new Date("2026-10-01T01:00:00.000Z"))).toEqual(new Date("2026-09-01T03:00:00.000Z"));
  });
});
