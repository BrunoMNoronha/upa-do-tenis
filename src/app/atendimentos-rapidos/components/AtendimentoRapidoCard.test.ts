import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AtendimentoRapidoListagem } from "@/lib/atendimento-rapido";
import { AtendimentoRapidoCardView, EstornarAtendimentoRapidoDialogView } from "./AtendimentoRapidoCard";

const ativo: AtendimentoRapidoListagem = {
  id: "ar-1",
  codigo: "AR-17092026-0001",
  dataHora: "2026-09-17T13:00:00.000Z",
  valorTotal: 100,
  observacoes: null,
  itens: [{ id: "item-1", descricao: "Higienização", valor: 100 }],
  pagamentos: [
    { id: "pag-1", valor: 40, formaPagamento: { nome: "Dinheiro" } },
    { id: "pag-2", valor: 60, formaPagamento: { nome: "PIX" } },
  ],
  estorno: null,
};

const estornado: AtendimentoRapidoListagem = {
  ...ativo,
  id: "ar-2",
  codigo: "AR-17092026-0002",
  estorno: { dataEstorno: "2026-09-17T14:00:00.000Z", motivo: "Lançado em duplicidade" },
};

const renderCard = (atendimento: AtendimentoRapidoListagem) =>
  renderToStaticMarkup(createElement(AtendimentoRapidoCardView, { atendimento, onEstornar: () => {} }));

describe("AtendimentoRapidoCardView", () => {
  it("atendimento ativo tem botão Estornar e nenhuma etiqueta de estorno", () => {
    const html = renderCard(ativo);
    expect(html.match(/>Estornar<\/button>/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Estornar atendimento AR-17092026-0001"');
    expect(html).not.toContain("Estornado");
    expect(html).not.toContain("line-through");
  });

  it("atendimento estornado continua no histórico: sem botão, total riscado, etiqueta e motivo", () => {
    const html = renderCard(estornado);
    expect(html).not.toContain(">Estornar</button>");
    expect(html).toContain("line-through");
    expect(html).toContain(">Estornado</span>");
    expect(html).toContain("<strong>Estornado</strong> em");
    expect(html).toContain("Lançado em duplicidade");
    expect(html).toContain("Higienização");
  });
});

describe("EstornarAtendimentoRapidoDialogView", () => {
  const renderDialogo = (props: Partial<Parameters<typeof EstornarAtendimentoRapidoDialogView>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(EstornarAtendimentoRapidoDialogView, {
        atendimento: ativo,
        motivo: "",
        erro: null,
        enviando: false,
        onMotivoChange: () => {},
        onConfirmar: () => {},
        onCancelar: () => {},
        ...props,
      }),
    );

  it("sem atendimento selecionado → nada é renderizado", () => {
    expect(renderDialogo({ atendimento: null })).toBe("");
  });

  it("mostra código, total, cada pagamento e motivo obrigatório com rótulo", () => {
    const html = renderDialogo();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Estornar atendimento AR-17092026-0001?");
    expect(html).toMatch(/R\$\s100,00/);
    expect(html).toMatch(/Dinheiro<\/dt><dd>R\$\s40,00/);
    expect(html).toMatch(/PIX<\/dt><dd>R\$\s60,00/);
    expect(html).toContain("Todos os pagamentos são estornados");
    expect(html).toMatch(/<label[^>]*for="estornar-atendimento-motivo"/);
    expect(html).toMatch(/<textarea[^>]*id="estornar-atendimento-motivo"[^>]*required=""/);
    expect(html).toContain('maxLength="500"');
    expect(html).not.toContain('role="alert"');
  });

  it("erro da API aparece em role=alert ligado ao campo; enviando desabilita as ações", () => {
    const html = renderDialogo({ erro: "Este atendimento já foi estornado.", enviando: true });
    expect(html).toMatch(/role="alert"[^>]*>Este atendimento já foi estornado\.</);
    expect(html).toContain('aria-describedby="estornar-atendimento-erro"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="button"[^>]*>Voltar<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="submit"[^>]*>Estornando\.\.\.<\/button>/);
  });
});
