import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CancelarVendaDialogView, validarMotivoCancelamento } from "./CancelarVenda";
import { VendaCardView, type VendaListagem } from "./VendaCard";

const concluida: VendaListagem = {
  id: "venda-1",
  numero: "VD-17092026-0001",
  status: "CONCLUIDA",
  dataCancelamento: null,
  dataVenda: "2026-09-17T13:00:00.000Z",
  valorTotal: 41.8,
  formaPagamento: "Dinheiro",
  quantidadeItens: 2,
  observacoes: null,
};

const cancelada: VendaListagem = {
  ...concluida,
  id: "venda-2",
  numero: "VD-17092026-0002",
  status: "CANCELADA",
  dataCancelamento: "2026-09-17T14:00:00.000Z",
};

const acao = createElement("button", { type: "button" }, "Cancelar venda");

describe("VendaCardView", () => {
  it("venda concluída: etiqueta Concluída e ação de cancelar", () => {
    const html = renderToStaticMarkup(createElement(VendaCardView, { venda: concluida, acaoCancelar: acao }));
    expect(html).toContain(">Concluída</span>");
    expect(html).toContain(">Cancelar venda</button>");
    expect(html).not.toContain("line-through");
    expect(html).toContain('href="/vendas/venda-1"');
  });

  it("venda cancelada continua no histórico: etiqueta, total riscado, data e sem ação de cancelar", () => {
    const html = renderToStaticMarkup(createElement(VendaCardView, { venda: cancelada, acaoCancelar: acao }));
    expect(html).toContain(">Cancelada</span>");
    expect(html).not.toContain(">Concluída</span>");
    expect(html).toContain("line-through");
    expect(html).toMatch(/Cancelada em<\/span> 17\/09\/2026, 11:00/);
    expect(html).not.toContain(">Cancelar venda</button>");
    expect(html).toContain('href="/vendas/venda-2"');
  });
});

describe("CancelarVendaDialogView", () => {
  const venda = { id: "venda-1", numero: "VD-17092026-0001", valorTotal: 41.8, formaPagamento: "PIX", quantidadeItens: 2 };
  const renderDialogo = (props: Partial<Parameters<typeof CancelarVendaDialogView>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(CancelarVendaDialogView, {
        venda,
        motivo: "",
        erro: null,
        enviando: false,
        onMotivoChange: () => {},
        onConfirmar: () => {},
        onCancelar: () => {},
        ...props,
      }),
    );

  it("sem venda selecionada → nada é renderizado", () => {
    expect(renderDialogo({ venda: null })).toBe("");
  });

  it("mostra número, total, forma, itens, aviso de estoque e caixa e motivo obrigatório", () => {
    const html = renderDialogo();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Cancelar venda VD-17092026-0001?");
    expect(html).toMatch(/R\$\s41,80/);
    expect(html).toContain("PIX");
    expect(html).toContain("os produtos voltam ao estoque");
    expect(html).toMatch(/<label[^>]*for="cancelar-venda-motivo"/);
    expect(html).toMatch(/<textarea[^>]*id="cancelar-venda-motivo"[^>]*required=""/);
    expect(html).toContain('maxLength="500"');
    expect(html).not.toContain('role="alert"');
  });

  it("erro da API em role=alert ligado ao campo; enviando desabilita as ações", () => {
    const html = renderDialogo({ erro: "Esta venda já foi cancelada.", enviando: true });
    expect(html).toMatch(/role="alert"[^>]*>Esta venda já foi cancelada\.</);
    expect(html).toContain('aria-describedby="cancelar-venda-erro"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="button"[^>]*>Voltar<\/button>/);
    expect(html).toMatch(/<svg[^>]*class="[^"]*animate-spin[^"]*"[^>]*>/);
  });
});

describe("validarMotivoCancelamento", () => {
  it("exige de 5 a 500 caracteres depois de aparar, como a API", () => {
    expect(validarMotivoCancelamento(" abcd ")).toMatch(/ao menos 5/);
    expect(validarMotivoCancelamento(" abcde ")).toBeNull();
    expect(validarMotivoCancelamento("x".repeat(501))).toMatch(/no máximo 500/);
  });
});
