import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import { ServicosClient } from "./servicos/servicos-client";
import { ProdutoList } from "./produtos/components/produto-list";
import { InsumosClient } from "./insumos/insumos-client";

const servicos = [
  { id: "s1", nome: "Troca de Sola", descricao: null, precoBase: 50, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
];
const produtos = [
  { id: "p1", nome: "Cadarço", descricao: null, precoVenda: 10, quantidadeEstoque: 3, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
];
const insumos = [
  { id: "i1", nome: "Cola", descricao: null, unidadeMedida: "ml", quantidadeEstoque: 5, estoqueMinimo: 1, custoUnitario: 2, ativo: true },
];

describe("campo de busca nas listagens", () => {
  it("Serviços exibe campo acessível e mantém a lista completa sem termo", () => {
    const html = renderToStaticMarkup(createElement(ServicosClient, { servicos }));
    expect(html).toContain('aria-label="Buscar serviço"');
    expect(html).toContain('placeholder="Buscar serviço..."');
    expect(html).toContain("Troca de Sola");
    expect(html).toContain("Total: 1");
  });

  it("Produtos exibe campo acessível e mantém a lista completa sem termo", () => {
    const html = renderToStaticMarkup(
      createElement(ProdutoList, { produtos, onEdit: () => {}, onDeleteCurrent: () => {} }),
    );
    expect(html).toContain('aria-label="Buscar produto"');
    expect(html).toContain("Cadarço");
  });

  it("Insumos exibe campo acessível, mantém a lista completa e o filtro de alerta existente", () => {
    const html = renderToStaticMarkup(createElement(InsumosClient, { insumos, mostrarAlerta: true }));
    expect(html).toContain('aria-label="Buscar insumo"');
    expect(html).toContain("Cola");
    expect(html).toContain("Limpar filtros");
    expect(html).toContain("Itens em Alerta");
  });
});
