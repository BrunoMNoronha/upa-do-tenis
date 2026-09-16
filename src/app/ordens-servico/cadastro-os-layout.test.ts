import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// O drawer de cadastro abre quando a URL traz ?nova=1.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("nova=1"),
  usePathname: () => "/ordens-servico",
}));

import { OrdensServicoClient } from "./ordens-servico-client";
import { dataOperacionalHoje } from "@/lib/date-range";
import { calcularPrazoPrevistoPadrao } from "@/lib/ordens-servico-prazo";

const filtros = { statusOperacional: "TODAS" as const, statusFinanceiro: "TODAS" as const, busca: "", atrasadas: false };
const paginacao = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

function renderizarCadastro() {
  return renderToStaticMarkup(createElement(OrdensServicoClient, {
    initialOrders: [],
    pagination: paginacao,
    estatisticas: { abertas: 0, emAndamento: 0, comSaldo: 0, atrasadas: 0 },
    filtros,
    clientes: [{ id: "c1", nome: "Cliente Teste", telefone: "11987654321" }],
    servicos: [{ id: "s1", nome: "Troca de sola", precoBase: 50 }],
  }));
}

/** Posição de um trecho no HTML; falha se ausente. */
function posicao(html: string, trecho: string) {
  const idx = html.indexOf(trecho);
  expect(idx, `esperava encontrar "${trecho}"`).toBeGreaterThan(-1);
  return idx;
}

describe("layout do formulário de cadastro de OS", () => {
  const html = renderizarCadastro();

  it("mantém os campos da OS com os mesmos ids (bindings inalterados)", () => {
    for (const id of ["clienteId", "dataEntrada", "numeroOS", "prazoPrevisto", "observacoes"]) {
      expect(html, `campo #${id}`).toContain(`id="${id}"`);
    }
  });

  it("renderiza um card de item com descrição, foto e serviços; sem valor total digitável (issue #205)", () => {
    expect(html).toContain('data-testid="item-recebido-0"');
    expect(html).toContain('name="itens.0.descricao"');
    expect(html).toMatch(/<input[^>]*id="item-[^"]+-foto"[^>]*type="file"/);
    expect(html).toMatch(/<input[^>]*id="item-[^"]+-servico"[^>]*role="combobox"/);
    expect(html).toContain(">+ Adicionar outro item</button>");
    expect(html).toContain('data-testid="total-ordem"');
    expect(html).not.toContain('id="valorEstimado"');
    expect(html).not.toContain('id="itemRecebido"');
  });

  it("gera ids do card determinísticos entre SSR e hidratação (não usa a clientKey no DOM)", () => {
    // A clientKey é um UUID gerado por render; se aparecesse em id/htmlFor,
    // o HTML do servidor divergiria do primeiro render do navegador.
    const ids = [...html.matchAll(/id="(item-[^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(id, id).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
    }
    expect(renderizarCadastro()).toBe(html);
  });

  it("organiza o formulário em seções na ordem: cliente, dados da OS, itens recebidos, observações", () => {
    const secoes = ["Cliente", "Dados da Ordem de Serviço", "Itens recebidos", "Observações"];
    // O título pode trazer o marcador de obrigatório após o texto.
    const posicoes = secoes.map((titulo) => posicao(html, `tracking-[0.16em] text-[color:var(--accent-strong)]">${titulo}`));
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it("preserva uma ordem de tabulação lógica entre os campos", () => {
    const ordem = [
      'id="clienteId"',
      'id="dataEntrada"',
      'id="numeroOS"',
      'id="prazoPrevisto"',
      'name="itens.0.descricao"',
      'type="file"',
      'placeholder="Adicionar serviço..."',
      ">Subtotal do item</span>",
      ">+ Adicionar outro item</button>",
      'data-testid="total-ordem"',
      'id="observacoes"',
      ">Cancelar</button>",
      'type="submit"',
    ];
    const posicoes = ordem.map((trecho) => posicao(html, trecho));
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it("usa grid responsivo de duas colunas e ação principal com largura total no mobile", () => {
    expect(html).toContain("md:grid-cols-2");
    const submit = /<button[^>]*type="submit"[^>]*>Cadastrar ordem<\/button>/.exec(html)?.[0];
    expect(submit).toBeDefined();
    expect(submit).toContain("w-full sm:w-auto");
  });

  it("sugere data de entrada de hoje e prazo previsto de 5 dias sem domingos", () => {
    const hoje = dataOperacionalHoje();
    expect(html).toMatch(new RegExp(`<input[^>]*id="dataEntrada"[^>]*value="${hoje}"`));
    expect(html).toMatch(
      new RegExp(`<input[^>]*id="prazoPrevisto"[^>]*value="${calcularPrazoPrevistoPadrao(hoje)}"`),
    );
  });

  it("mantém as ações existentes: cadastrar (primária) e cancelar (secundária)", () => {
    expect(html).toContain("Cadastrar ordem");
    expect(html).toContain(">Cancelar</button>");
    expect(html).toContain('aria-label="Fechar cadastro de OS"');
  });
});
