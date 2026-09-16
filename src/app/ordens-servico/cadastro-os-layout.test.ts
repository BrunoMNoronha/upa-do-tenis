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

  it("mantém todos os campos existentes com os mesmos ids (bindings inalterados)", () => {
    for (const id of [
      "clienteId",
      "dataEntrada",
      "numeroOS",
      "prazoPrevisto",
      "itemRecebido",
      "fotoRecebimento",
      "servicoId",
      "valorEstimado",
      "observacoes",
    ]) {
      expect(html, `campo #${id}`).toContain(`id="${id}"`);
    }
  });

  it("organiza o formulário em seções na ordem: cliente, dados da OS, item, serviços, observações", () => {
    const secoes = ["Cliente", "Dados da Ordem de Serviço", "Item recebido", "Serviços", "Observações"];
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
      'id="itemRecebido"',
      'id="fotoRecebimento"',
      'id="servicoId"',
      'id="valorEstimado"',
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
