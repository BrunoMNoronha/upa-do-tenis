import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, findFirst, chamadas } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  chamadas: [] as string[],
}));

// Só leituras de produto são permitidas: qualquer outro acesso (venda, caixa,
// estoque, escrita) falha o teste. Prova que o fluxo público não tem efeitos.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, {
    get(_alvo, modelo) {
      if (modelo !== "produto") throw new Error(`Acesso indevido no catálogo público: ${String(modelo)}`);
      return new Proxy({}, {
        get(_m, operacao) {
          chamadas.push(String(operacao));
          if (operacao === "findMany") return findMany;
          if (operacao === "findFirst") return findFirst;
          throw new Error(`Operação indevida no catálogo público: produto.${String(operacao)}`);
        },
      });
    },
  }),
}));

import {
  ONDE_PRODUTO_VISIVEL,
  buscarProdutosCatalogoPorIds,
  listarProdutosCatalogo,
  obterImagemProdutoCatalogo,
} from "./catalogo-publico";
import { situacaoNoCatalogo } from "./catalogo-regras";

function linha(parcial: Partial<{ id: string; nome: string; descricao: string | null; precoVenda: Prisma.Decimal; imagemPathname: string | null }> = {}) {
  return {
    id: "prod-1",
    nome: "Cadarço",
    descricao: "  Algodão  ",
    precoVenda: new Prisma.Decimal("10.5"),
    imagemPathname: null,
    ...parcial,
  };
}

describe("catálogo público", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chamadas.length = 0;
  });

  it("filtra por publicado + ativo + estoque positivo e seleciona só campos comerciais", async () => {
    findMany.mockResolvedValue([linha()]);

    await listarProdutosCatalogo();

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ publicadoNoCatalogo: true, ativo: true, quantidadeEstoque: { gt: 0 } });
    expect(Object.keys(args.select).sort()).toEqual(["descricao", "id", "imagemPathname", "nome", "precoVenda"]);
    expect(args.select).not.toHaveProperty("quantidadeEstoque");
  });

  it("a projeção não expõe estoque, datas nem pathname e converte preço para centavos", async () => {
    findMany.mockResolvedValue([linha({ imagemPathname: "catalogo/produtos/prod-1/a.webp" })]);

    const [produto] = await listarProdutosCatalogo();

    expect(produto).toEqual({
      id: "prod-1",
      nome: "Cadarço",
      descricao: "Algodão",
      precoCentavos: 1050,
      versaoImagem: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(JSON.stringify(produto)).not.toContain("catalogo/produtos");
  });

  it("produto sem imagem e descrição vazia", async () => {
    findMany.mockResolvedValue([linha({ descricao: "   " })]);

    const [produto] = await listarProdutosCatalogo();

    expect(produto.descricao).toBeNull();
    expect(produto.versaoImagem).toBeNull();
  });

  it("omite produto com preço fora do formato monetário em vez de arredondar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    findMany.mockResolvedValue([linha({ id: "ok" }), linha({ id: "ruim", precoVenda: new Prisma.Decimal("1000000000") })]);

    const produtos = await listarProdutosCatalogo();

    expect(produtos.map((produto) => produto.id)).toEqual(["ok"]);
  });

  it("revalidação busca só os ids pedidos, ainda visíveis", async () => {
    findMany.mockResolvedValue([linha()]);

    await buscarProdutosCatalogoPorIds(["prod-1", "prod-2"]);

    expect(findMany.mock.calls[0][0].where).toEqual({ ...ONDE_PRODUTO_VISIVEL, id: { in: ["prod-1", "prod-2"] } });
  });

  it("revalidação sem ids não consulta o banco", async () => {
    expect(await buscarProdutosCatalogoPorIds([])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("imagem só para produto visível", async () => {
    findFirst.mockResolvedValue(null);
    expect(await obterImagemProdutoCatalogo("prod-1")).toBeNull();
    expect(findFirst.mock.calls[0][0].where).toEqual({ ...ONDE_PRODUTO_VISIVEL, id: "prod-1" });
  });

  it("só faz leituras de produto", async () => {
    findMany.mockResolvedValue([]);
    findFirst.mockResolvedValue(null);

    await listarProdutosCatalogo();
    await buscarProdutosCatalogoPorIds(["a"]);
    await obterImagemProdutoCatalogo("a");

    expect(new Set(chamadas)).toEqual(new Set(["findMany", "findFirst"]));
  });

  it("o filtro do banco equivale à regra situacaoNoCatalogo", () => {
    const casos = [
      { publicadoNoCatalogo: true, ativo: true, quantidadeEstoque: 1 },
      { publicadoNoCatalogo: true, ativo: true, quantidadeEstoque: 0 },
      { publicadoNoCatalogo: true, ativo: false, quantidadeEstoque: 3 },
      { publicadoNoCatalogo: false, ativo: true, quantidadeEstoque: 3 },
    ];
    for (const caso of casos) {
      const peloFiltro =
        caso.publicadoNoCatalogo === ONDE_PRODUTO_VISIVEL.publicadoNoCatalogo &&
        caso.ativo === ONDE_PRODUTO_VISIVEL.ativo &&
        caso.quantidadeEstoque > ONDE_PRODUTO_VISIVEL.quantidadeEstoque.gt;
      expect(peloFiltro, JSON.stringify(caso)).toBe(situacaoNoCatalogo(caso) === "VISIVEL");
    }
  });
});
