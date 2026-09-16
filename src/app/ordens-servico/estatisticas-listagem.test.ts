import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const captura = vi.hoisted(() => ({ stats: {} as Record<string, unknown> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), useSearchParams: () => new URLSearchParams(), usePathname: () => "/ordens-servico" }));
vi.mock("@/components/ui", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/ui")>(),
  StatCard: ({ label, value }: { label: string; value: unknown }) => { captura.stats[label] = value; return null; },
}));
import { OrdensServicoClient } from "./ordens-servico-client";

const filtros = { statusOperacional: "TODAS" as const, statusFinanceiro: "TODAS" as const, busca: "", atrasadas: false };
const paginacao = (total: number) => ({ page: 1, pageSize: 20, total, totalPages: Math.max(1, Math.ceil(total / 20)) });

describe("contadores exibidos na listagem de OS", () => {
  beforeEach(() => { captura.stats = {}; });
  it("usa os contadores globais do servidor, independentes da página e do filtro ativo", () => {
    // A página traz só 2 ordens (filtro ativo), mas os cards refletem o total do banco.
    const initialOrders = [
      { status: "ABERTA", saldo: 10 }, { status: "ABERTA", saldo: 0 },
    ].map((os, i) => ({ ...os, id: String(i), numero: String(i), cliente: { nome: "Teste", telefone: "11987654321" }, dataPrevisao: new Date("2026-01-01"), valorTotal: 10, valorPago: 0, statusFinanceiro: "PENDENTE", itens: [] }));
    renderToStaticMarkup(createElement(OrdensServicoClient, {
      initialOrders,
      pagination: paginacao(2),
      estatisticas: { abertas: 2, emAndamento: 1, comSaldo: 3, atrasadas: 0 },
      filtros: { ...filtros, statusOperacional: "ABERTA" },
      clientes: [],
      servicos: [],
    }));
    expect(captura.stats).toEqual({ Abertas: 2, "Em andamento": 1, "Com saldo": 3 });
  });
  it("exibe alerta consolidado com o total global de OS atrasadas", () => {
    const html = renderToStaticMarkup(createElement(OrdensServicoClient, {
      initialOrders: [],
      pagination: paginacao(0),
      estatisticas: { abertas: 0, emAndamento: 0, comSaldo: 0, atrasadas: 2 },
      filtros,
      clientes: [],
      servicos: [],
    }));
    expect(html).toContain("2 ordens de serviço atrasadas");
    expect(html).toContain("Ver atrasadas");
    expect(html).toContain("Atrasadas (2)");
  });
  it("alterna o botão do alerta quando o filtro de atrasadas está ativo", () => {
    const html = renderToStaticMarkup(createElement(OrdensServicoClient, {
      initialOrders: [],
      pagination: paginacao(0),
      estatisticas: { abertas: 0, emAndamento: 0, comSaldo: 0, atrasadas: 1 },
      filtros: { ...filtros, atrasadas: true },
      clientes: [],
      servicos: [],
    }));
    expect(html).toContain("1 ordem de serviço atrasada");
    expect(html).toContain("Mostrar todas");
  });
  it("não exibe alerta quando não há OS atrasadas", () => {
    const html = renderToStaticMarkup(createElement(OrdensServicoClient, {
      initialOrders: [],
      pagination: paginacao(0),
      estatisticas: { abertas: 0, emAndamento: 0, comSaldo: 0, atrasadas: 0 },
      filtros,
      clientes: [],
      servicos: [],
    }));
    expect(html).not.toContain("ordens de serviço atrasadas");
    expect(html).not.toContain("Ver atrasadas");
  });
  it("exibe zeros quando não há ordens", () => {
    renderToStaticMarkup(createElement(OrdensServicoClient, {
      initialOrders: [],
      pagination: paginacao(0),
      estatisticas: { abertas: 0, emAndamento: 0, comSaldo: 0, atrasadas: 0 },
      filtros,
      clientes: [],
      servicos: [],
    }));
    expect(captura.stats).toEqual({ Abertas: 0, "Em andamento": 0, "Com saldo": 0 });
  });
  it("renderiza os controles de paginação com o total vindo do servidor", () => {
    const html = renderToStaticMarkup(createElement(OrdensServicoClient, {
      initialOrders: [],
      pagination: { page: 2, pageSize: 20, total: 45, totalPages: 3 },
      estatisticas: { abertas: 0, emAndamento: 0, comSaldo: 0, atrasadas: 0 },
      filtros,
      clientes: [],
      servicos: [],
    }));
    expect(html).toContain("Página 2 de 3");
    expect(html).toContain("Exibindo 21–40 de 45 ordens");
    expect(html).toContain('href="/ordens-servico?page=3"');
    expect(html).toContain('href="/ordens-servico"');
  });
});
