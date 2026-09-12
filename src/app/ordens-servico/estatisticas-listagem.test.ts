import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const captura = vi.hoisted(() => ({ stats: {} as Record<string, unknown> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams(), usePathname: () => "/ordens-servico" }));
vi.mock("@/components/ui", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/ui")>(),
  StatCard: ({ label, value }: { label: string; value: unknown }) => { captura.stats[label] = value; return null; },
}));
import { OrdensServicoClient } from "./ordens-servico-client";
describe("contadores exibidos na listagem de OS", () => {
  beforeEach(() => { captura.stats = {}; });
  it("mantém totais independentes para status e saldo", () => {
    const initialOrders = [
      { status: "ABERTA", saldo: 10 }, { status: "ABERTA", saldo: 0 },
      { status: "EM_ANDAMENTO", saldo: "2.50" }, { status: "ENTREGUE", saldo: -1 },
      { status: "CANCELADA", saldo: null }, { status: "CONCLUIDA", saldo: 1 },
    ].map((os, i) => ({ ...os, id: String(i), numero: String(i), cliente: { nome: "Teste", telefone: "11987654321" }, dataPrevisao: new Date("2026-01-01"), valorTotal: 10, valorPago: 0, statusFinanceiro: "PENDENTE", itens: [] }));
    renderToStaticMarkup(createElement(OrdensServicoClient, { initialOrders, clientes: [], servicos: [] }));
    expect(captura.stats).toEqual({ Abertas: 2, "Em andamento": 1, "Com saldo": 3 });
  });
  it("exibe zeros quando não há ordens", () => {
    renderToStaticMarkup(createElement(OrdensServicoClient, { initialOrders: [], clientes: [], servicos: [] }));
    expect(captura.stats).toEqual({ Abertas: 0, "Em andamento": 0, "Com saldo": 0 });
  });
});
