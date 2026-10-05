import { beforeEach, afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { banco, exigirSessaoMock, revalidarMock } = vi.hoisted(() => ({
  banco: {
    servico: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    servicoItemOrdem: { count: vi.fn() },
    itemAtendimentoRapido: { count: vi.fn() },
    formaPagamento: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    pagamento: { count: vi.fn() },
    venda: { count: vi.fn() },
    movimentacaoCaixa: { count: vi.fn() },
    configuracaoSistema: { upsert: vi.fn(), findUnique: vi.fn() },
    cliente: { findMany: vi.fn() },
  },
  exigirSessaoMock: vi.fn(),
  revalidarMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: banco }));
vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: exigirSessaoMock }));
vi.mock("next/cache", () => ({ unstable_cache: vi.fn((callback) => callback), revalidateTag: revalidarMock }));

import { DADOS_EMPRESA_PADRAO } from "@/lib/dados-empresa";
import { POST as criarServico, GET as lerServicos } from "./servicos/route";
import { PATCH as editarServico, DELETE as excluirServico } from "./servicos/[id]/route";
import { POST as criarForma } from "./formas-pagamento/route";
import { PATCH as editarForma, DELETE as excluirForma } from "./formas-pagamento/[id]/route";
import { PUT as salvarLink, GET as lerLink } from "./configuracoes/route";
import { PUT as salvarEmpresa, GET as lerEmpresa } from "./configuracoes/dados-empresa/route";
import { GET as lerOpcoesCadastroOS } from "./ordens-servico/opcoes-cadastro/route";

type Caso = {
  nome: string;
  metodo: string;
  caminho: string;
  corpo?: unknown;
  executar: (request: NextRequest) => Promise<Response>;
  mutacao: Mock;
  status: number;
  recurso: string;
};

const parametros = () => ({ params: Promise.resolve({ id: "cache-id" }) });
const casos: Caso[] = [
  { nome: "criar serviço", metodo: "POST", caminho: "servicos", corpo: { nome: "Serviço Cache", precoBase: 10 }, executar: criarServico, mutacao: banco.servico.create, status: 201, recurso: "servicos" },
  { nome: "editar serviço", metodo: "PATCH", caminho: "servicos/cache-id", corpo: { nome: "Serviço Cache" }, executar: (req) => editarServico(req, parametros()), mutacao: banco.servico.update, status: 200, recurso: "servicos" },
  { nome: "excluir serviço", metodo: "DELETE", caminho: "servicos/cache-id", executar: (req) => excluirServico(req, parametros()), mutacao: banco.servico.delete, status: 204, recurso: "servicos" },
  { nome: "criar forma", metodo: "POST", caminho: "formas-pagamento", corpo: { nome: "PIX Cache", tipo: "PIX" }, executar: criarForma, mutacao: banco.formaPagamento.create, status: 201, recurso: "formas-pagamento" },
  { nome: "editar forma", metodo: "PATCH", caminho: "formas-pagamento/cache-id", corpo: { nome: "PIX Cache" }, executar: (req) => editarForma(req, parametros()), mutacao: banco.formaPagamento.update, status: 200, recurso: "formas-pagamento" },
  { nome: "excluir forma", metodo: "DELETE", caminho: "formas-pagamento/cache-id", executar: (req) => excluirForma(req, parametros()), mutacao: banco.formaPagamento.delete, status: 204, recurso: "formas-pagamento" },
  { nome: "salvar link", metodo: "PUT", caminho: "configuracoes", corpo: { linkAvaliacaoGoogle: "https://example.test/review" }, executar: salvarLink, mutacao: banco.configuracaoSistema.upsert, status: 200, recurso: "link-avaliacao-google" },
  { nome: "salvar empresa", metodo: "PUT", caminho: "configuracoes/dados-empresa", corpo: DADOS_EMPRESA_PADRAO, executar: salvarEmpresa, mutacao: banco.configuracaoSistema.upsert, status: 200, recurso: "dados-empresa" },
];

const casosGetPrivados = [
  { caminho: "servicos", executar: lerServicos },
  { caminho: "configuracoes", executar: lerLink },
  { caminho: "configuracoes/dados-empresa", executar: lerEmpresa },
  { caminho: "ordens-servico/opcoes-cadastro", executar: lerOpcoesCadastroOS },
];

function conferirAusenciaDeLeituras() {
  expect(banco.servico.findMany).not.toHaveBeenCalled();
  expect(banco.formaPagamento.findMany).not.toHaveBeenCalled();
  expect(banco.configuracaoSistema.findUnique).not.toHaveBeenCalled();
  expect(banco.cliente.findMany).not.toHaveBeenCalled();
}

function requisicao(caso: Caso, corpo = caso.corpo) {
  return new NextRequest(`http://localhost/api/${caso.caminho}`, {
    method: caso.metodo,
    headers: { "Content-Type": "application/json" },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
}

describe("invalidação de dados nas APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CACHE_DADOS_ENABLED", "false");
    vi.stubEnv("DATABASE_URL", "postgresql://teste:local@localhost:5432/cache_test?schema=public");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    exigirSessaoMock.mockResolvedValue(null);
    banco.formaPagamento.findUnique.mockResolvedValue({ tipo: "PIX" });
    for (const contar of [banco.servicoItemOrdem.count, banco.itemAtendimentoRapido.count, banco.pagamento.count, banco.venda.count, banco.movimentacaoCaixa.count]) contar.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(casos)("$nome invalida somente depois da persistência, mesmo com a flag desligada", async (caso) => {
    let confirmar!: (valor: unknown) => void;
    let iniciar!: () => void;
    const iniciada = new Promise<void>((resolve) => { iniciar = resolve; });
    caso.mutacao.mockImplementation(() => {
      iniciar();
      return new Promise((resolve) => { confirmar = resolve; });
    });
    const respostaPendente = caso.executar(requisicao(caso));
    await iniciada;
    expect(revalidarMock).not.toHaveBeenCalled();
    confirmar({ id: "cache-id" });
    expect((await respostaPendente).status).toBe(caso.status);
    expect(revalidarMock).toHaveBeenCalledTimes(1);
    expect(revalidarMock).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`:${caso.recurso}$`)));
  });

  it.each(casos)("$nome preserva sucesso se a invalidação falhar", async (caso) => {
    caso.mutacao.mockResolvedValue({ id: "cache-id" });
    revalidarMock.mockImplementation(() => { throw new Error("indisponível"); });
    expect((await caso.executar(requisicao(caso))).status).toBe(caso.status);
    expect(console.error).toHaveBeenCalled();
  });

  it.each(casos)("$nome não invalida nem grava sem sessão", async (caso) => {
    exigirSessaoMock.mockResolvedValue(NextResponse.json({ message: "Não autenticado." }, { status: 401 }));
    expect((await caso.executar(requisicao(caso))).status).toBe(401);
    expect(caso.mutacao).not.toHaveBeenCalled();
    expect(revalidarMock).not.toHaveBeenCalled();
  });

  it.each(casos)("$nome não invalida se o banco recusar a persistência", async (caso) => {
    caso.mutacao.mockRejectedValue(new Error("falha SQL"));
    expect((await caso.executar(requisicao(caso))).status).toBe(500);
    expect(revalidarMock).not.toHaveBeenCalled();
  });

  it.each(casos.filter((caso) => caso.metodo !== "DELETE"))("$nome não invalida dados inválidos", async (caso) => {
    expect((await caso.executar(requisicao(caso, { nome: "", tipo: "inválido", linkAvaliacaoGoogle: "http://inseguro", versao: 999 }))).status).toBe(400);
    expect(caso.mutacao).not.toHaveBeenCalled();
    expect(revalidarMock).not.toHaveBeenCalled();
  });

  it("não invalida exclusão de serviço com vínculos", async () => {
    banco.servicoItemOrdem.count.mockResolvedValue(1);
    expect((await excluirServico(new NextRequest("http://localhost/api/servicos/cache-id", { method: "DELETE" }), parametros())).status).toBe(409);
    expect(revalidarMock).not.toHaveBeenCalled();
  });

  it("não invalida troca de tipo de forma com movimento financeiro", async () => {
    banco.pagamento.count.mockResolvedValue(1);
    const resposta = await editarForma(new NextRequest("http://localhost/api/formas-pagamento/cache-id", { method: "PATCH", body: JSON.stringify({ tipo: "DINHEIRO" }) }), parametros());
    expect(resposta.status).toBe(409);
    expect(revalidarMock).not.toHaveBeenCalled();
  });

  it.each(casos.filter((caso) => ["PATCH", "DELETE"].includes(caso.metodo)))("$nome não invalida registro inexistente", async (caso) => {
    caso.mutacao.mockRejectedValue({ code: "P2025" });
    expect((await caso.executar(requisicao(caso))).status).toBe(404);
    expect(revalidarMock).not.toHaveBeenCalled();
  });

  it.each(casosGetPrivados)("GET $caminho preserva sessão por request e proíbe cache HTTP", async ({ caminho, executar }) => {
    banco.servico.findMany.mockResolvedValue([]);
    banco.configuracaoSistema.findUnique.mockResolvedValue(null);
    banco.cliente.findMany.mockResolvedValue([]);
    const resposta = await executar(new NextRequest(`http://localhost/api/${caminho}`));
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(exigirSessaoMock).toHaveBeenCalledTimes(1);
  });

  it.each(casosGetPrivados)("GET $caminho responde 401 sem cache HTTP e sem consultar dados", async ({ caminho, executar }) => {
    const recusa = NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    exigirSessaoMock.mockResolvedValue(recusa);

    const resposta = await executar(new NextRequest(`http://localhost/api/${caminho}`));

    expect(resposta).toBe(recusa);
    expect(resposta.status).toBe(401);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await resposta.json()).toEqual({ message: "Não autenticado." });
    conferirAusenciaDeLeituras();
  });

  it.each(casosGetPrivados)("GET $caminho mantém no-store no erro 500 da validação de sessão", async ({ caminho, executar }) => {
    exigirSessaoMock.mockRejectedValue(new Error("Falha ao verificar sessão"));

    const resposta = await executar(new NextRequest(`http://localhost/api/${caminho}`));

    expect(resposta.status).toBe(500);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    conferirAusenciaDeLeituras();
  });
});
