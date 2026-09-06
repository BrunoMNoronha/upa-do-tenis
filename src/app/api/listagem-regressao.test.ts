import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { listarServicosMock, listarProdutosMock, listarInsumosMock, listarOrdensServicoMock } = vi.hoisted(() => ({
  listarServicosMock: vi.fn(),
  listarProdutosMock: vi.fn(),
  listarInsumosMock: vi.fn(),
  listarOrdensServicoMock: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/servicos", () => ({
  listarServicos: listarServicosMock,
}));

vi.mock("@/lib/produtos", () => ({
  listarProdutos: listarProdutosMock,
}));

vi.mock("@/lib/insumos", () => ({
  listarInsumos: listarInsumosMock,
}));

vi.mock("@/lib/ordens-servico", () => ({
  listarOrdensServico: listarOrdensServicoMock,
}));

import { GET as getServicos } from "./servicos/route";
import { GET as getProdutos } from "./produtos/route";
import { GET as getInsumos } from "./insumos/route";
import { GET as getOrdens } from "./ordens-servico/route";

describe("GET listagens da API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista serviços com status 200", async () => {
    const servicos = [{ id: "s-1", nome: "Limpeza", ativo: true }];
    listarServicosMock.mockResolvedValueOnce(servicos);

    const response = await getServicos(new NextRequest("http://localhost/api/servicos"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(servicos);
  });

  it("lista produtos com status 200", async () => {
    const produtos = [{ id: "p-1", nome: "Tênis", ativo: true }];
    listarProdutosMock.mockResolvedValueOnce(produtos);

    const response = await getProdutos(new NextRequest("http://localhost/api/produtos"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(produtos);
  });

  it("lista insumos com status 200", async () => {
    const insumos = [{ id: "i-1", nome: "Lixa", ativo: true }];
    listarInsumosMock.mockResolvedValueOnce(insumos);

    const response = await getInsumos(new NextRequest("http://localhost/api/insumos"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(insumos);
  });

  it("lista ordens de serviço com status 200", async () => {
    const ordens = [{ id: "os-1", numero: "OS-01012026-0001", status: "ABERTA" }];
    listarOrdensServicoMock.mockResolvedValueOnce(ordens);

    const response = await getOrdens(new NextRequest("http://localhost/api/ordens-servico"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(ordens);
  });
});
