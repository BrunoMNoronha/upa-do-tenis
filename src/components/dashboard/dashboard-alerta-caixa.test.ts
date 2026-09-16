import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardAlertaCaixaView, type SituacaoAlertaCaixa } from "./DashboardAlertaCaixa";

const renderizar = (situacao: SituacaoAlertaCaixa) =>
  renderToStaticMarkup(createElement(DashboardAlertaCaixaView, { situacao }));

describe("DashboardAlertaCaixaView", () => {
  it("sem caixa aberto → alerta 'Caixa fechado' com ação para /caixa", () => {
    const html = renderizar({
      tipo: "pronto",
      alerta: { estado: "FECHADO", caixaId: null, dataAbertura: null, horaAbertura: null },
    });
    expect(html).toContain("Caixa fechado");
    expect(html).toContain("Não há caixa aberto para o expediente atual.");
    expect(html).toContain('href="/caixa"');
    expect(html).toContain("Abrir caixa");
  });

  it("caixa aberto hoje → lembrete informativo com hora de abertura", () => {
    const html = renderizar({
      tipo: "pronto",
      alerta: { estado: "ABERTO_HOJE", caixaId: "c1", dataAbertura: "16/09/2026", horaAbertura: "08:05" },
    });
    expect(html).toContain("Caixa aberto desde 08:05");
    expect(html).toContain("Lembre-se de realizar o fechamento ao final do expediente.");
    expect(html).toContain("Ver caixa");
    expect(html).toContain('href="/caixa"');
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Caixa fechado");
    expect(html).not.toContain("pendente");
  });

  it("caixa de dia anterior → alerta de fechamento pendente com data e hora", () => {
    const html = renderizar({
      tipo: "pronto",
      alerta: { estado: "FECHAMENTO_PENDENTE", caixaId: "c1", dataAbertura: "15/09/2026", horaAbertura: "08:03" },
    });
    expect(html).toContain("Fechamento de caixa pendente");
    expect(html).toContain("Há um caixa aberto desde 15/09/2026 às 08:03.");
    expect(html).toContain("Revisar e fechar caixa");
    expect(html).toContain('href="/caixa"');
    expect(html).toContain('role="alert"');
  });

  it("carregando → skeleton, sem alerta falso de caixa fechado", () => {
    const html = renderizar({ tipo: "carregando" });
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Caixa fechado");
    expect(html).not.toContain("Abrir caixa");
  });

  it("erro na consulta → aviso não bloqueante, sem assumir caixa fechado", () => {
    const html = renderizar({ tipo: "erro" });
    expect(html).toContain("Não foi possível verificar o estado do caixa agora.");
    expect(html).not.toContain("Caixa fechado");
    expect(html).not.toContain("Abrir caixa");
  });
});
