import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({ exigirSessao: vi.fn() }));
vi.mock("@/lib/dados-cache", () => ({ obterDadosEmpresaComCache: vi.fn().mockResolvedValue({ nomeFantasia: "UPA do Tênis", nomeComplementar: null }) }));
vi.mock("@/lib/ordens-servico", () => ({
  listarOrdensServicoResumoPaginado: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
  contarEstatisticasOrdensServico: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/components/app-shell", () => ({ AppShell: () => null }));
vi.mock("./ordens-servico-client", () => ({ OrdensServicoClient: () => null }));

import Page from "./page";
import { listarOrdensServicoResumoPaginado } from "@/lib/ordens-servico";

describe("leitura da listagem de OS", () => {
  it("renderiza o shell antes de aguardar a consulta, dentro de Suspense", async () => {
    const pagina = await Page({ searchParams: Promise.resolve({}) });
    const suspense = pagina.props.children as ReactElement;
    const lista = suspense.props.children as ReactElement;
    expect(vi.mocked(listarOrdensServicoResumoPaginado)).not.toHaveBeenCalled();
    const cliente = await (lista.type as (props: unknown) => Promise<ReactElement>)(lista.props);
    expect(vi.mocked(listarOrdensServicoResumoPaginado)).toHaveBeenCalledTimes(1);
    expect(cliente.props.initialOrders).toEqual([]);
    expect(cliente.props.nomeEmpresa).toBe("UPA do Tênis");
  });
});
