import { describe, expect, it } from "vitest";

import { filtrarPorBusca, normalizarTextoBusca } from "./busca-listagem";

type Item = { nome: string; descricao: string | null };

const itens: Item[] = [
  { nome: "Troca de Sola", descricao: "Sola de borracha" },
  { nome: "Cola Tênis", descricao: null },
  { nome: "Limpeza", descricao: "Higienização completa" },
];

const campos = (item: Item) => [item.nome, item.descricao];

describe("normalizarTextoBusca", () => {
  it("remove acentos, caixa e espaços nas extremidades", () => {
    expect(normalizarTextoBusca("  Tênis  ")).toBe("tenis");
    expect(normalizarTextoBusca(null)).toBe("");
    expect(normalizarTextoBusca(undefined)).toBe("");
  });
});

describe("filtrarPorBusca", () => {
  it("retorna todos os itens quando o termo é vazio ou só espaços", () => {
    expect(filtrarPorBusca(itens, "", campos)).toEqual(itens);
    expect(filtrarPorBusca(itens, "   ", campos)).toEqual(itens);
  });

  it("não diferencia maiúsculas/minúsculas e ignora espaços nas extremidades", () => {
    expect(filtrarPorBusca(itens, "  TROCA ", campos).map((i) => i.nome)).toEqual(["Troca de Sola"]);
  });

  it("é tolerante a acentos nos dois sentidos", () => {
    expect(filtrarPorBusca(itens, "tenis", campos).map((i) => i.nome)).toEqual(["Cola Tênis"]);
    expect(filtrarPorBusca(itens, "higienizaçao", campos).map((i) => i.nome)).toEqual(["Limpeza"]);
  });

  it("pesquisa nos campos adicionais e ignora campos nulos", () => {
    expect(filtrarPorBusca(itens, "borracha", campos).map((i) => i.nome)).toEqual(["Troca de Sola"]);
    expect(filtrarPorBusca(itens, "cola", campos).map((i) => i.nome)).toEqual(["Cola Tênis"]);
  });

  it("retorna lista vazia sem correspondência e preserva a ordem original", () => {
    expect(filtrarPorBusca(itens, "inexistente", campos)).toEqual([]);
    expect(filtrarPorBusca(itens, "a", campos)).toEqual(itens);
  });

  it("não quebra com caracteres especiais de regex", () => {
    expect(filtrarPorBusca(itens, "(sola", campos)).toEqual([]);
    expect(filtrarPorBusca(itens, ".*", campos)).toEqual([]);
  });
});
