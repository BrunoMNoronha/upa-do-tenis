import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Pagamento } from "../types";
import { EstornarPagamentoDialogView, HistoricoPagamentosView, validarMotivoEstorno } from "./HistoricoPagamentosList";

const ativo: Pagamento = {
  id: "pag-ativo",
  tipo: "PAGAMENTO",
  valor: 60,
  dataPagamento: "2026-09-17T13:00:00.000Z",
  formaPagamento: { id: "pix", nome: "PIX" },
  estorno: null,
};

const estornado: Pagamento = {
  id: "pag-estornado",
  tipo: "PAGAMENTO",
  valor: 40,
  dataPagamento: "2026-09-16T13:00:00.000Z",
  formaPagamento: { id: "din", nome: "Dinheiro" },
  estorno: {
    id: "est-1",
    motivo: "Lançado em duplicidade",
    dataEstorno: "2026-09-17T14:00:00.000Z",
    usuario: { id: "u1", nome: "Maria" },
  },
};

const renderLista = (podeEstornar: boolean) =>
  renderToStaticMarkup(
    createElement(HistoricoPagamentosView, { pagamentos: [ativo, estornado], podeEstornar, onEstornar: () => {} }),
  );

describe("HistoricoPagamentosView (#230, fatia 4)", () => {
  it("pagamento ativo tem botão Estornar; estornado aparece riscado com etiqueta, usuário e motivo", () => {
    const html = renderLista(true);
    expect(html.match(/>Estornar<\/button>/g)).toHaveLength(1);
    expect(html).toMatch(/aria-label="Estornar pagamento de R\$\s60,00"/);
    expect(html).toContain("line-through");
    expect(html).toContain("<strong>Estornado</strong> em");
    expect(html).toContain(" por Maria — Lançado em duplicidade");
  });

  it("OS cancelada: nenhum botão Estornar, mas o histórico de estorno continua visível", () => {
    const html = renderLista(false);
    expect(html).not.toContain(">Estornar</button>");
    expect(html).toContain("Lançado em duplicidade");
  });
});

describe("EstornarPagamentoDialogView", () => {
  const renderDialogo = (props: Partial<Parameters<typeof EstornarPagamentoDialogView>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(EstornarPagamentoDialogView, {
        pagamento: ativo,
        motivo: "",
        erro: null,
        enviando: false,
        onMotivoChange: () => {},
        onConfirmar: () => {},
        onCancelar: () => {},
        ...props,
      }),
    );

  it("sem pagamento selecionado → nada é renderizado", () => {
    expect(renderDialogo({ pagamento: null })).toBe("");
  });

  it("mostra valor, forma, data e motivo obrigatório com rótulo", () => {
    const html = renderDialogo();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/R\$\s60,00/);
    expect(html).toContain("PIX");
    expect(html).toMatch(/<label[^>]*for="estornar-pagamento-motivo"/);
    expect(html).toMatch(/<textarea[^>]*id="estornar-pagamento-motivo"[^>]*required=""/);
    expect(html).toContain('maxLength="500"');
    expect(html).not.toContain('role="alert"');
  });

  it("erro da API aparece em role=alert ligado ao campo; enviando desabilita as ações", () => {
    const html = renderDialogo({ erro: "Não há caixa aberto. Abra o caixa primeiro.", enviando: true });
    expect(html).toMatch(/role="alert"[^>]*>Não há caixa aberto\. Abra o caixa primeiro\.</);
    expect(html).toContain('aria-describedby="estornar-pagamento-erro"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="button"[^>]*>Voltar<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="submit"[^>]*>Estornando\.\.\.<\/button>/);
  });
});

describe("validarMotivoEstorno", () => {
  it("exige de 5 a 500 caracteres depois de aparar, como a API", () => {
    expect(validarMotivoEstorno("    ")).toMatch(/ao menos 5/);
    expect(validarMotivoEstorno(" abcd ")).toMatch(/ao menos 5/);
    expect(validarMotivoEstorno(" abcde ")).toBeNull();
    expect(validarMotivoEstorno("x".repeat(500))).toBeNull();
    expect(validarMotivoEstorno("x".repeat(501))).toMatch(/no máximo 500/);
  });
});
