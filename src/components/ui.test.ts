import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Badge, Button, FilterChip, Input, KpiCard, Label, SearchInput } from "./ui";

function render<P extends object>(Componente: ComponentType<P>, props: P) {
  return renderToStaticMarkup(createElement(Componente, props));
}

describe("KpiCard", () => {
  it("vira link quando recebe href e mostra rótulo, valor e dica", () => {
    const html = render(KpiCard, { label: "Abertas", value: 32, hint: "aguardando análise", dot: "warning", href: "/ordens-servico?statusOp=ABERTA" });
    expect(html).toMatch(/<a[^>]+href="\/ordens-servico\?statusOp=ABERTA"/);
    expect(html).toContain("Abertas");
    expect(html).toContain(">32<");
    expect(html).toContain("aguardando análise");
    expect(html).toContain("bg-[color:var(--warning)]");
  });

  it("vira botão com aria-pressed quando recebe onClick", () => {
    const html = render(KpiCard, { label: "Ativos", value: 3, onClick: () => undefined, active: true });
    expect(html).toContain('<button type="button"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("border-[color:var(--accent)]");
  });

  it("no tom danger pinta o card e exibe o texto de link", () => {
    const html = render(KpiCard, { label: "Atrasadas", value: 7, tone: "danger", linkLabel: "Ver atrasadas →", href: "/ordens-servico?atrasadas=true" });
    expect(html).toContain("bg-[color:var(--danger-soft)]");
    expect(html).toContain("Ver atrasadas →");
  });

  it("sem href nem onClick renderiza só o cartão", () => {
    const html = render(KpiCard, { label: "Total", value: 1 });
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });
});

describe("Button", () => {
  it("aplica o tamanho compacto e o ícone", () => {
    const html = render(Button, { size: "sm", variant: "secondary", icon: createElement("i", { "data-icon": "x" }), children: "Editar" });
    expect(html).toContain("min-h-9");
    expect(html).toContain('data-icon="x"');
    expect(html).toContain("Editar");
  });

  it("renderiza como link quando recebe href", () => {
    const html = render(Button, { href: "/clientes", variant: "text", children: "Limpar" });
    expect(html).toMatch(/<a[^>]+href="\/clientes"/);
    expect(html).toContain("text-[color:var(--accent)]");
  });
});

describe("Badge", () => {
  it("usa a paleta do design para cada tom", () => {
    expect(render(Badge, { tone: "danger", children: "Inativo" })).toContain("bg-[color:var(--danger-badge-bg)]");
    expect(render(Badge, { tone: "success", children: "Ativo" })).toContain("bg-[color:var(--success-soft)]");
    expect(render(Badge, { tone: "neutral", children: "Aberta" })).toContain("bg-[color:var(--surface-muted)]");
    expect(render(Badge, { tone: "accent", size: "md", children: "216 ordens" })).toContain("text-xs");
  });
});

describe("FilterChip", () => {
  it("como link marca o ativo com aria-current e fundo escuro", () => {
    const html = render(FilterChip, { href: "/clientes?status=ativos", active: true, children: "Ativos" });
    expect(html).toContain('href="/clientes?status=ativos"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("bg-[color:var(--ink)]");
  });

  it("como botão usa aria-pressed", () => {
    const html = render(FilterChip, { onClick: () => undefined, active: false, children: "Todos" });
    expect(html).toContain('aria-pressed="false"');
  });
});

describe("Label e Input", () => {
  it("marca campos obrigatórios de forma visual e acessível", () => {
    const html = render(Label, { htmlFor: "nome", obrigatorio: true, children: "Nome" });
    expect(html).toContain('aria-hidden="true"> *</span>');
    expect(html).toContain("(obrigatório)");
  });

  it("mantém checkbox compacto e campo de texto com 44px", () => {
    expect(render(Input, { type: "checkbox" })).toContain("h-[18px] w-[18px]");
    expect(render(Input, { type: "text" })).toContain("h-11");
  });
});

describe("SearchInput", () => {
  it("exibe Limpar apenas com texto e quando há onClear", () => {
    const com = render(SearchInput, { id: "b", label: "Buscar", value: "ana", onChange: () => undefined, onClear: () => undefined });
    const sem = render(SearchInput, { id: "b", label: "Buscar", value: "", onChange: () => undefined, onClear: () => undefined });
    expect(com).toContain("Limpar");
    expect(com).toContain('type="search"');
    expect(com).toContain('aria-label="Buscar"');
    expect(sem).not.toContain("Limpar");
  });
});
