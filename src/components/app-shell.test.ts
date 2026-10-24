import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/clientes",
}));

import { AppShell } from "./app-shell";

const dadosEmpresa = {
  nomeFantasia: "UPA do Tênis",
  nomeComplementar: "Sapataria Alves",
  razaoSocial: "Sapataria Alves LTDA",
  cnpj: "",
  telefone: "",
  endereco: "",
};

type PropsShell = Parameters<typeof AppShell>[0];

function renderizar(props: Partial<Omit<PropsShell, "children">> = {}) {
  const completas: PropsShell = {
    title: "Clientes",
    description: "Base de clientes.",
    eyebrow: "Cadastro e consulta",
    dadosEmpresa: dadosEmpresa as never,
    usuario: { nome: "Marcos Alves", email: "marcos@exemplo.com" },
    ...props,
    children: createElement("p", null, "conteúdo"),
  };
  return renderToStaticMarkup(createElement(AppShell, completas));
}

describe("AppShell", () => {
  it("mostra a marca com iniciais e o usuário da sessão no rodapé do menu", () => {
    const html = renderizar();
    expect(html).toContain(">UT<");
    expect(html).toContain("UPA do Tênis");
    expect(html).toContain("Sapataria Alves");
    expect(html).toContain(">MA<");
    expect(html).toContain("Marcos Alves");
    expect(html).toContain("marcos@exemplo.com");
    expect(html).toContain('aria-label="Sair"');
    expect(html).not.toContain("MVP v1");
  });

  it("renderiza o cabeçalho plano com eyebrow, título e descrição", () => {
    const html = renderizar();
    expect(html).toContain("Cadastro e consulta");
    expect(html).toContain("<h1");
    expect(html).toContain("Clientes</h1>");
    expect(html).toContain("Base de clientes.");
  });

  it("marca o item ativo do menu pela rota", () => {
    const html = renderizar();
    expect(html).toMatch(/<a(?=[^>]*href="\/clientes")(?=[^>]*aria-current="page")[^>]*>/);
  });

  it("usa actions no lugar da action legada quando informado", () => {
    const html = renderizar({
      action: { href: "/ordens-servico", label: "Ir para OS" },
      actions: createElement("button", { type: "button" }, "Novo cliente"),
    });
    expect(html).toContain("Novo cliente");
    expect(html).not.toContain("Ir para OS");
  });

  it("renderiza a action legada como botão de link", () => {
    const html = renderizar({ action: { href: "/ordens-servico?nova=1", label: "Nova ordem" } });
    expect(html).toContain('href="/ordens-servico?nova=1"');
    expect(html).toContain("Nova ordem");
  });

  it("não desenha cabeçalho com ocultarCabecalho", () => {
    const html = renderizar({ ocultarCabecalho: true });
    expect(html).not.toContain("<h1");
    expect(html).toContain("conteúdo");
  });

  it("funciona sem usuário informado", () => {
    const html = renderizar({ usuario: undefined });
    expect(html).toContain('aria-label="Sair"');
    expect(html).not.toContain("Marcos Alves");
  });
});
