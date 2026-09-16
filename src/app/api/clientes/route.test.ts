import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), listar: vi.fn(), criar: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: mocks.auth }));
vi.mock("@/lib/clientes", () => ({ listarClientesPaginado: mocks.listar, criarCliente: mocks.criar }));
import { GET, POST } from "./route";
const payload = { nome: "Cliente Teste", telefone: "11987654321" };
const request = (body: unknown = payload) => new NextRequest("http://localhost/api/clientes", { method: "POST", body: JSON.stringify(body) });
describe("contrato e erros da API de clientes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());
  it("preserva busca e devolve listagem paginada { data, pagination }", async () => {
    const resultado = { data: [payload], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };
    mocks.listar.mockResolvedValue(resultado);
    const response = await GET(new NextRequest("http://localhost/api/clientes?search=Teste"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(resultado);
    expect(mocks.listar).toHaveBeenCalledWith({ search: "Teste", paginacao: { page: 1, pageSize: 20, skip: 0, take: 20 } });
  });
  it("repassa page/pageSize junto com a busca e normaliza valores inválidos", async () => {
    mocks.listar.mockResolvedValue({ data: [], pagination: { page: 3, pageSize: 10, total: 0, totalPages: 1 } });
    await GET(new NextRequest("http://localhost/api/clientes?search=Teste&page=3&pageSize=10"));
    expect(mocks.listar).toHaveBeenCalledWith({ search: "Teste", paginacao: { page: 3, pageSize: 10, skip: 20, take: 10 } });
    await GET(new NextRequest("http://localhost/api/clientes?page=-2&pageSize=1000"));
    expect(mocks.listar).toHaveBeenLastCalledWith({ search: undefined, paginacao: { page: 1, pageSize: 100, skip: 0, take: 100 } });
  });
  it("preserva criação válida", async () => {
    mocks.criar.mockResolvedValue({ id: "teste", ...payload });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ cliente: { id: "teste", ...payload } });
  });
  it("rejeita campos inválidos sem gravar", async () => {
    expect((await POST(request({}))).status).toBe(400);
    expect(mocks.criar).not.toHaveBeenCalled();
  });
  it("retorna 409 para duplicidade sem expor detalhes", async () => {
    mocks.criar.mockRejectedValue({ code: "P2002", message: "detalhe-interno" });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "Já existe um cliente cadastrado com este e-mail ou CPF/CNPJ." });
  });
  it.each(["GET", "POST"])("sanitiza falha inesperada de %s", async (method) => {
    mocks.listar.mockRejectedValue(new Error("detalhe-interno"));
    mocks.criar.mockRejectedValue(new Error("detalhe-interno"));
    const response = await (method === "GET" ? GET(request()) : POST(request()));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("detalhe-interno");
    expect(console.error).toHaveBeenCalled();
  });
  it.each(["GET", "POST"])("bloqueia %s sem sessão", async (method) => {
    mocks.auth.mockResolvedValue(NextResponse.json({ message: "Não autenticado." }, { status: 401 }));
    expect((await (method === "GET" ? GET(request()) : POST(request()))).status).toBe(401);
    expect(mocks.criar).not.toHaveBeenCalled();
    expect(mocks.listar).not.toHaveBeenCalled();
  });
});
