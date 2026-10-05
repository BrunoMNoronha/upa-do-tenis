import { Prisma } from "@prisma/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const entradas = new Map<string, { valor: string; tags: string[] }>();
  return {
    entradas,
    prisma: {
      servico: { findMany: vi.fn() },
      formaPagamento: { findMany: vi.fn() },
      cliente: { findMany: vi.fn() },
      configuracaoSistema: { findUnique: vi.fn() },
    },
    unstable_cache: vi.fn((consultar: () => Promise<unknown>, keyParts?: string[], opcoes?: { tags?: string[]; revalidate?: number | false }) => async () => {
      const chave = JSON.stringify([consultar.toString(), keyParts]);
      const entrada = entradas.get(chave);
      if (entrada) return JSON.parse(entrada.valor);
      const resultado = await consultar();
      entradas.set(chave, { valor: JSON.stringify(resultado), tags: opcoes?.tags ?? [] });
      return resultado;
    }),
    revalidateTag: vi.fn((tag: string) => {
      for (const [chave, entrada] of entradas) {
        if (entrada.tags.includes(tag)) entradas.delete(chave);
      }
    }),
  };
});

vi.mock("next/cache", () => ({ unstable_cache: mocks.unstable_cache, revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import {
  invalidarCacheDadosEmpresa,
  invalidarCacheFormasPagamento,
  invalidarCacheLinkAvaliacaoGoogle,
  invalidarCacheServicos,
  listarFormasPagamentoComCache,
  listarOpcoesCadastroOSComCache,
  listarServicosComCache,
  obterDadosEmpresaComCache,
  obterDadosEmpresaPersistidosComCache,
  obterLinkAvaliacaoGoogleComCache,
} from "./dados-cache";
import { DADOS_EMPRESA_PADRAO } from "./dados-empresa";

const servico = {
  id: "srv-1",
  nome: "Troca de sola",
  descricao: "Sola de borracha",
  precoBase: new Prisma.Decimal("125.50"),
  ativo: true,
  criadoEm: new Date("2026-09-01T12:00:00.000Z"),
  atualizadoEm: new Date("2026-09-02T13:00:00.000Z"),
};

function ultimaChave(): string[] {
  return mocks.unstable_cache.mock.calls.at(-1)?.[1] ?? [];
}

describe("cache de dados operacionais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.entradas.clear();
    vi.stubEnv("CACHE_DADOS_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DATABASE_URL", "postgresql://user:secret@db.example:5432/upa?schema=public");
    mocks.prisma.servico.findMany.mockResolvedValue([servico]);
    mocks.prisma.formaPagamento.findMany.mockResolvedValue([{ id: "fp-1", nome: "PIX", tipo: "PIX", criadoEm: new Date() }]);
    mocks.prisma.cliente.findMany.mockResolvedValue([{ id: "cli-1", nome: "Maria", telefone: "61999999999" }]);
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("normaliza Decimal e Date antes do cache, preservando todos os campos do GET de serviços", async () => {
    const frio = await listarServicosComCache();
    const quente = await listarServicosComCache();
    expect(frio).toEqual([{
      id: "srv-1", nome: "Troca de sola", descricao: "Sola de borracha", precoBase: "125.5", ativo: true,
      criadoEm: "2026-09-01T12:00:00.000Z", atualizadoEm: "2026-09-02T13:00:00.000Z",
    }]);
    expect(quente).toEqual(frio);
    expect(JSON.parse(JSON.stringify(frio))).toEqual(frio);
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledWith({ where: { ativo: true }, orderBy: { nome: "asc" } });
    expect(mocks.unstable_cache.mock.calls[0]?.[2]).toEqual({ revalidate: 300, tags: [expect.stringMatching(/:servicos$/)] });
  });

  it("reduz formas de pagamento ao DTO operacional estável no cache frio e quente", async () => {
    expect(await listarFormasPagamentoComCache()).toEqual([{ id: "fp-1", nome: "PIX", tipo: "PIX" }]);
    expect(await listarFormasPagamentoComCache()).toEqual([{ id: "fp-1", nome: "PIX", tipo: "PIX" }]);
    expect(mocks.prisma.formaPagamento.findMany).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, "false", "1", "TRUE"])("faz bypass quando a flag não é true: %s", async (flag) => {
    vi.stubEnv("CACHE_DADOS_ENABLED", flag);
    const frio = await listarServicosComCache();
    expect(await listarServicosComCache()).toEqual(frio);
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.unstable_cache).not.toHaveBeenCalled();
  });

  it.each([undefined, "URL inválida", "https://db.example/upa", "postgresql://db.example", "postgresql://db.example/%ZZ"])("não utiliza cache com DATABASE_URL inválida: %s", async (url) => {
    vi.stubEnv("DATABASE_URL", url);
    await listarServicosComCache();
    await listarServicosComCache();
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.unstable_cache).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("não inclui credenciais na identidade e mantém namespace após rotação de senha", async () => {
    await listarServicosComCache();
    const original = ultimaChave();
    vi.stubEnv("DATABASE_URL", "postgresql://other:rotated@db.example/upa?schema=public&sslmode=require");
    await listarServicosComCache();
    expect(ultimaChave()).toEqual(original);
    expect(original[0]).toMatch(/^upa-dados-v1:preview:[a-f0-9]{64}$/);
    expect(JSON.stringify(mocks.unstable_cache.mock.calls)).not.toMatch(/secret|rotated|db\.example|sslmode/);
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    "postgresql://user:secret@other.example:5432/upa?schema=public",
    "postgresql://user:secret@db.example:5433/upa?schema=public",
    "postgresql://user:secret@db.example:5432/other?schema=public",
    "postgresql://user:secret@db.example:5432/upa?schema=other",
  ])("isola cache quando muda host, porta, banco ou schema: %s", async (url) => {
    await listarServicosComCache();
    const original = ultimaChave();
    vi.stubEnv("DATABASE_URL", url);
    await listarServicosComCache();
    expect(ultimaChave()).not.toEqual(original);
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(2);
  });

  it("isola Preview/Production e usa NODE_ENV na ausência de VERCEL_ENV", async () => {
    await listarServicosComCache();
    const preview = ultimaChave();
    vi.stubEnv("VERCEL_ENV", "production");
    await listarServicosComCache();
    expect(ultimaChave()).not.toEqual(preview);
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("NODE_ENV", "development");
    await listarServicosComCache();
    expect(ultimaChave()[0]).toMatch(/^upa-dados-v1:development:/);
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(3);
  });

  it("mantém clientes atuais em cada abertura de OS e reutiliza apenas o catálogo", async () => {
    const antes = await listarOpcoesCadastroOSComCache();
    mocks.prisma.cliente.findMany.mockResolvedValueOnce([{ id: "cli-2", nome: "Ana", telefone: "61888888888" }]);
    const depois = await listarOpcoesCadastroOSComCache();
    expect(antes.clientes[0]?.id).toBe("cli-1");
    expect(depois.clientes[0]?.id).toBe("cli-2");
    expect(depois.servicos).toEqual([{ id: "srv-1", nome: "Troca de sola", precoBase: "125.5" }]);
    expect(mocks.prisma.cliente.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.cliente.findMany).toHaveBeenCalledWith({
      where: { ativo: true }, orderBy: [{ criadoEm: "desc" }, { nome: "asc" }], select: { id: true, nome: true, telefone: true },
    });
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(1);
    expect([...mocks.entradas.values()].some(({ valor }) => valor.includes("61999999999"))).toBe(false);
  });

  it("armazena apenas a configuração bruta e entrega dados institucionais validados", async () => {
    const valor = JSON.stringify({ ...DADOS_EMPRESA_PADRAO, nomeFantasia: "Empresa atual" });
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor });
    expect((await obterDadosEmpresaComCache()).nomeFantasia).toBe("Empresa atual");
    expect((await obterDadosEmpresaComCache()).nomeFantasia).toBe("Empresa atual");
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(1);
    expect(JSON.parse([...mocks.entradas.values()][0]!.valor)).toBe(valor);
    expect(mocks.unstable_cache.mock.calls[0]?.[2]?.revalidate).toBe(300);
  });

  it("não persiste fallback de indisponibilidade transitória e recupera na próxima leitura", async () => {
    mocks.prisma.configuracaoSistema.findUnique.mockRejectedValueOnce(new Error("postgresql://secret@db.example"));
    expect(await obterDadosEmpresaComCache()).toEqual(DADOS_EMPRESA_PADRAO);
    expect(mocks.entradas.size).toBe(0);
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor: JSON.stringify({ ...DADOS_EMPRESA_PADRAO, nomeFantasia: "Recuperada" }) });
    expect((await obterDadosEmpresaComCache()).nomeFantasia).toBe("Recuperada");
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith("Falha ao carregar dadosEmpresa; usando fallback seguro.");
  });

  it("compartilha callback, chave e tag RAW entre empresa com fallback e persistida", async () => {
    const dadosSalvos = { ...DADOS_EMPRESA_PADRAO, nomeFantasia: "Loja configurada", whatsapp: "11987654321" };
    const valor = JSON.stringify(dadosSalvos);
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor });
    expect(await obterDadosEmpresaComCache()).toEqual(dadosSalvos);
    expect(await obterDadosEmpresaPersistidosComCache()).toEqual(dadosSalvos);
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(1);
    const [comFallback, persistida] = mocks.unstable_cache.mock.calls;
    expect(persistida?.[0]).toBe(comFallback?.[0]);
    expect(persistida?.[1]).toEqual(comFallback?.[1]);
    expect(persistida?.[2]).toEqual(comFallback?.[2]);
    expect(persistida?.[2]?.tags?.[0]).toMatch(/:dados-empresa$/);
    expect(JSON.parse([...mocks.entradas.values()][0]!.valor)).toBe(valor);
  });

  it("empresa persistida ausente retorna null sem herdar o WhatsApp do fallback", async () => {
    expect(await obterDadosEmpresaPersistidosComCache()).toBeNull();
    expect((await obterDadosEmpresaComCache()).whatsapp).toBe(DADOS_EMPRESA_PADRAO.whatsapp);
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(1);
    expect(JSON.parse([...mocks.entradas.values()][0]!.valor)).toBeNull();
  });

  it.each([
    "{JSON malformado",
    JSON.stringify({ versao: 2 }),
    JSON.stringify({ ...DADOS_EMPRESA_PADRAO, whatsapp: "123" }),
  ])("empresa persistida inválida retorna null com validação fora do cache: %s", async (valor) => {
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor });
    expect(await obterDadosEmpresaPersistidosComCache()).toBeNull();
    expect(await obterDadosEmpresaComCache()).toEqual(DADOS_EMPRESA_PADRAO);
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(1);
    expect(JSON.parse([...mocks.entradas.values()][0]!.valor)).toBe(valor);

    invalidarCacheDadosEmpresa();
    const dadosSalvos = { ...DADOS_EMPRESA_PADRAO, whatsapp: "11987654321" };
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor: JSON.stringify(dadosSalvos) });
    expect(await obterDadosEmpresaPersistidosComCache()).toEqual(dadosSalvos);
    expect(await obterDadosEmpresaComCache()).toEqual(dadosSalvos);
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(2);
  });

  it("falha temporária da leitura persistida retorna null sem impedir recuperação", async () => {
    mocks.prisma.configuracaoSistema.findUnique.mockRejectedValueOnce(new Error("postgresql://password@db.example"));
    expect(await obterDadosEmpresaPersistidosComCache()).toBeNull();
    expect(mocks.entradas.size).toBe(0);
    const dadosSalvos = { ...DADOS_EMPRESA_PADRAO, whatsapp: "11987654321" };
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor: JSON.stringify(dadosSalvos) });
    expect(await obterDadosEmpresaPersistidosComCache()).toEqual(dadosSalvos);
    expect(await obterDadosEmpresaComCache()).toEqual(dadosSalvos);
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith("Falha ao carregar dadosEmpresa persistidos.");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/password|db\.example/);
  });

  it("empresa persistida válida sem WhatsApp continua sem destino", async () => {
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor: JSON.stringify({ ...DADOS_EMPRESA_PADRAO, whatsapp: null }) });
    expect((await obterDadosEmpresaPersistidosComCache())?.whatsapp).toBeNull();
    expect((await obterDadosEmpresaComCache()).whatsapp).toBeNull();
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(1);
  });

  it.each(["{JSON malformado", '{"versao":1,"nomeFantasia":""}'])("aplica fallback fora do cache para configuração inválida: %s", async (valor) => {
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor });
    expect(await obterDadosEmpresaComCache()).toEqual(DADOS_EMPRESA_PADRAO);
    expect(JSON.parse([...mocks.entradas.values()][0]!.valor)).toBe(valor);
    invalidarCacheDadosEmpresa();
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor: JSON.stringify({ ...DADOS_EMPRESA_PADRAO, nomeFantasia: "Corrigida" }) });
    expect((await obterDadosEmpresaComCache()).nomeFantasia).toBe("Corrigida");
  });

  it("usa fallback clonado para empresa ausente e null para link ausente", async () => {
    const empresa = await obterDadosEmpresaComCache();
    empresa.endereco.cidade = "Alteração do consumidor";
    expect((await obterDadosEmpresaComCache()).endereco.cidade).toBe(DADOS_EMPRESA_PADRAO.endereco.cidade);
    expect(await obterLinkAvaliacaoGoogleComCache()).toBeNull();
    expect(mocks.prisma.configuracaoSistema.findUnique.mock.calls.map(([consulta]) => consulta.where.chave)).toEqual(["dadosEmpresa", "linkAvaliacaoGoogle"]);
  });

  it("normaliza o link e propaga falha de leitura sem cachear um resultado ausente", async () => {
    mocks.prisma.configuracaoSistema.findUnique.mockRejectedValueOnce(new Error("Falha temporária"));
    await expect(obterLinkAvaliacaoGoogleComCache()).rejects.toThrow("Falha temporária");
    expect(mocks.entradas.size).toBe(0);
    mocks.prisma.configuracaoSistema.findUnique.mockResolvedValue({ valor: " https://example.com/review " });
    expect(await obterLinkAvaliacaoGoogleComCache()).toBe("https://example.com/review");
    expect(await obterLinkAvaliacaoGoogleComCache()).toBe("https://example.com/review");
    expect(mocks.prisma.configuracaoSistema.findUnique).toHaveBeenCalledTimes(2);
  });

  it("propaga falha do catálogo sem memorizar erro ou array vazio", async () => {
    mocks.prisma.servico.findMany.mockRejectedValueOnce(new Error("Falha temporária"));
    await expect(listarServicosComCache()).rejects.toThrow("Falha temporária");
    expect(mocks.entradas.size).toBe(0);
    expect(await listarServicosComCache()).toHaveLength(1);
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(2);
  });

  it("invalida mesmo com flag desligada para impedir reaproveitar dados anteriores ao bypass", async () => {
    await listarServicosComCache();
    await listarFormasPagamentoComCache();
    await obterDadosEmpresaComCache();
    await obterLinkAvaliacaoGoogleComCache();
    vi.stubEnv("CACHE_DADOS_ENABLED", "false");
    invalidarCacheServicos();
    invalidarCacheFormasPagamento();
    invalidarCacheDadosEmpresa();
    invalidarCacheLinkAvaliacaoGoogle();
    expect(mocks.revalidateTag.mock.calls.map(([tag]) => tag.split(":").at(-1))).toEqual([
      "servicos", "formas-pagamento", "dados-empresa", "link-avaliacao-google",
    ]);
    expect(mocks.entradas.size).toBe(0);
    vi.stubEnv("CACHE_DADOS_ENABLED", "true");
    await listarServicosComCache();
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(2);
  });

  it("invalida somente o recurso alterado", async () => {
    await listarServicosComCache();
    await listarFormasPagamentoComCache();
    invalidarCacheServicos();
    await listarServicosComCache();
    await listarFormasPagamentoComCache();
    expect(mocks.prisma.servico.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.formaPagamento.findMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["servicos", invalidarCacheServicos],
    ["formas-pagamento", invalidarCacheFormasPagamento],
    ["dados-empresa", invalidarCacheDadosEmpresa],
    ["link-avaliacao-google", invalidarCacheLinkAvaliacaoGoogle],
  ])("falha de invalidação de %s preserva sucesso e registra recurso e categoria segura", (recurso, invalidar) => {
    const falha = new Error("postgresql://password@db.example/upa");
    falha.name = "postgresql://password@db.example/upa";
    mocks.revalidateTag.mockImplementationOnce(() => { throw falha; });
    expect(invalidar).not.toThrow();
    expect(console.error).toHaveBeenCalledWith("Falha ao invalidar cache de dados.", { recurso, tipoErro: "Error" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/password|db\.example/);
  });

  it.each(["TypeError", "RangeError", "PrismaClientKnownRequestError", "PrismaClientInitializationError"])("registra a categoria permitida %s sem mensagem ou stack", (tipoErro) => {
    const falha = new Error("postgresql://password@db.example/upa");
    falha.name = tipoErro;
    mocks.revalidateTag.mockImplementationOnce(() => { throw falha; });
    expect(invalidarCacheServicos).not.toThrow();
    expect(console.error).toHaveBeenCalledWith("Falha ao invalidar cache de dados.", { recurso: "servicos", tipoErro });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/password|db\.example/);
  });

  it("classifica falha não tipada sem registrar seu payload", () => {
    const falha = { mensagem: "password", dados: { url: "db.example" } };
    mocks.revalidateTag.mockImplementationOnce(() => { throw falha; });
    expect(invalidarCacheServicos).not.toThrow();
    expect(console.error).toHaveBeenCalledWith("Falha ao invalidar cache de dados.", { recurso: "servicos", tipoErro: "Desconhecido" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/password|db\.example/);
  });
});
