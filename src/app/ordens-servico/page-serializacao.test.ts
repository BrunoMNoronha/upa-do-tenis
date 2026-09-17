import { Prisma } from "@prisma/client";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({ exigirSessao: vi.fn() }));
vi.mock("@/lib/clientes", () => ({ listarClientes: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/servicos", () => ({
  listarServicos: vi.fn().mockResolvedValue([
    { id: "servico", nome: "Reparo", precoBase: new Prisma.Decimal("1234567890.123456789") },
  ]),
}));
vi.mock("@/lib/ordens-servico", () => ({
  listarOrdensServicoPaginado: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
  contarEstatisticasOrdensServico: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/components/app-shell", () => ({ AppShell: () => null }));
vi.mock("./ordens-servico-client", () => ({ OrdensServicoClient: () => null }));

import Page from "./page";

describe("fronteira servidor/cliente da listagem de OS", () => {
  it("entrega preço serializável sem perder casas decimais", async () => {
    const pagina = await Page({ searchParams: Promise.resolve({}) });
    const suspense = pagina.props.children as ReactElement;
    const cliente = suspense.props.children as ReactElement;
    expect(cliente.props.servicos).toEqual([
      { id: "servico", nome: "Reparo", precoBase: "1234567890.123456789" },
    ]);
    expect(JSON.parse(JSON.stringify(cliente.props.servicos))).toEqual(cliente.props.servicos);
  });
});
