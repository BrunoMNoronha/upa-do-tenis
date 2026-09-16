import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DashboardAlertasEstoqueView,
  descreverAlertasEstoque,
  type SituacaoAlertasEstoque,
} from "./DashboardAlertasEstoque";

const renderizar = (situacao: SituacaoAlertasEstoque) =>
  renderToStaticMarkup(createElement(DashboardAlertasEstoqueView, { situacao }));

describe("descreverAlertasEstoque", () => {
  it("usa as contagens reais com plural correto", () => {
    expect(descreverAlertasEstoque({ totalInsumosZerados: 1, totalInsumosAbaixoMinimo: 2, totalCriticos: 3 })).toBe(
      "1 insumo zerado · 2 insumos abaixo do mínimo"
    );
    expect(descreverAlertasEstoque({ totalInsumosZerados: 0, totalInsumosAbaixoMinimo: 1, totalCriticos: 1 })).toBe(
      "1 insumo abaixo do mínimo"
    );
    expect(descreverAlertasEstoque({ totalInsumosZerados: 2, totalInsumosAbaixoMinimo: 0, totalCriticos: 2 })).toBe(
      "2 insumos zerados"
    );
  });
});

describe("DashboardAlertasEstoqueView", () => {
  it("com críticos → alerta com contagens e link para estoque baixo", () => {
    const html = renderizar({
      tipo: "pronto",
      alertas: { totalInsumosZerados: 1, totalInsumosAbaixoMinimo: 2, totalCriticos: 3 },
    });
    expect(html).toContain("3 insumos precisam de atenção");
    expect(html).toContain("1 insumo zerado · 2 insumos abaixo do mínimo");
    expect(html).toContain('href="/insumos?estoqueBaixo=true"');
    expect(html).toContain("Ver estoque baixo");
    expect(html).toContain('role="alert"');
    // Ícones em SVG, sem emoji.
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}⚠]/u);
  });

  it("apenas abaixo do mínimo → tom de atenção; com zerados → tom de erro", () => {
    const atencao = renderizar({
      tipo: "pronto",
      alertas: { totalInsumosZerados: 0, totalInsumosAbaixoMinimo: 1, totalCriticos: 1 },
    });
    const erro = renderizar({
      tipo: "pronto",
      alertas: { totalInsumosZerados: 1, totalInsumosAbaixoMinimo: 0, totalCriticos: 1 },
    });
    expect(atencao).toContain("1 insumo precisa de atenção");
    expect(atencao).toContain("--warning");
    expect(erro).toContain("--danger");
  });

  it("sem críticos → card informativo, não some da linha de alertas", () => {
    const html = renderizar({
      tipo: "pronto",
      alertas: { totalInsumosZerados: 0, totalInsumosAbaixoMinimo: 0, totalCriticos: 0 },
    });
    expect(html).toContain("Estoque sem alertas críticos");
    expect(html).toContain('href="/insumos"');
    expect(html).toContain('role="status"');
  });

  it("carregando → skeleton sem alerta falso", () => {
    const html = renderizar({ tipo: "carregando" });
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("atenção");
  });

  it("erro → aviso não bloqueante", () => {
    const html = renderizar({ tipo: "erro" });
    expect(html).toContain("Não foi possível verificar o estoque agora.");
    expect(html).toContain('href="/insumos"');
    expect(html).not.toContain("precisam de atenção");
  });
});
