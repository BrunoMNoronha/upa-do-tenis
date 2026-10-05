import "server-only";
import { createHash } from "node:crypto";
import { revalidateTag, unstable_cache } from "next/cache";

import { interpretarDadosEmpresa, obterConfiguracao } from "@/lib/configuracoes";
import { CHAVE_CONFIG_LINK_AVALIACAO_GOOGLE } from "@/lib/configuracoes-schema";
import { CHAVE_CONFIG_DADOS_EMPRESA, type DadosEmpresa } from "@/lib/dados-empresa";
import { listarFormasPagamento } from "@/lib/formas-pagamento";
import { listarClientesCadastroOS } from "@/lib/ordens-servico";
import { listarServicos } from "@/lib/servicos";

// Módulo exclusivo do servidor Next. Serviços puros e scripts CLI não o importam.
const VERSAO_CACHE = "upa-dados-v1";
const REVALIDACAO_SEGUNDOS = 300;
const TIPOS_ERRO_INVALIDACAO = new Set([
  "Error", "TypeError", "RangeError", "PrismaClientKnownRequestError", "PrismaClientInitializationError",
]);
type RecursoCache = "servicos" | "formas-pagamento" | "dados-empresa" | "link-avaliacao-google";

export type ServicoComCache = {
  id: string;
  nome: string;
  descricao: string | null;
  precoBase: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type FormaPagamentoComCache = {
  id: string;
  nome: string;
  tipo: string | null;
};

/** Identifica o destino sem colocar credenciais, URL ou parâmetros sensíveis nas chaves. */
function obterNamespace(): string | null {
  try {
    const banco = new URL(process.env.DATABASE_URL ?? "");
    const nomeBanco = decodeURIComponent(banco.pathname.slice(1));
    if (!["postgresql:", "postgres:"].includes(banco.protocol) || !banco.hostname || !nomeBanco) {
      return null;
    }

    const identidade = JSON.stringify([
      banco.hostname,
      banco.port || "5432",
      nomeBanco,
      banco.searchParams.get("schema") || "public",
    ]);
    const hash = createHash("sha256").update(identidade).digest("hex");
    const ambiente = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
    return `${VERSAO_CACHE}:${ambiente}:${hash}`;
  } catch {
    return null;
  }
}

function tagDoRecurso(namespace: string, recurso: RecursoCache): string {
  return `${namespace}:${recurso}`;
}

async function lerComCache<T>(recurso: RecursoCache, consultar: () => Promise<T>): Promise<T> {
  const namespace = obterNamespace();
  if (process.env.CACHE_DADOS_ENABLED !== "true" || !namespace) return consultar();

  return unstable_cache(consultar, [namespace, recurso], {
    tags: [tagDoRecurso(namespace, recurso)],
    revalidate: REVALIDACAO_SEGUNDOS,
  })();
}

async function consultarServicos(): Promise<ServicoComCache[]> {
  const servicos = await listarServicos();
  return servicos.map((servico) => ({
    id: servico.id,
    nome: servico.nome,
    descricao: servico.descricao,
    precoBase: servico.precoBase.toString(),
    ativo: servico.ativo,
    criadoEm: servico.criadoEm.toISOString(),
    atualizadoEm: servico.atualizadoEm.toISOString(),
  }));
}

async function consultarFormasPagamento(): Promise<FormaPagamentoComCache[]> {
  const formas = await listarFormasPagamento();
  return formas.map((forma) => ({ id: forma.id, nome: forma.nome, tipo: forma.tipo }));
}

export function listarServicosComCache(): Promise<ServicoComCache[]> {
  return lerComCache("servicos", consultarServicos);
}

export function listarFormasPagamentoComCache(): Promise<FormaPagamentoComCache[]> {
  return lerComCache("formas-pagamento", consultarFormasPagamento);
}

export async function obterDadosEmpresaComCache(): Promise<DadosEmpresa> {
  try {
    const valor = await lerComCache("dados-empresa", () => obterConfiguracao(CHAVE_CONFIG_DADOS_EMPRESA));
    return interpretarDadosEmpresa(valor);
  } catch {
    console.error("Falha ao carregar dadosEmpresa; usando fallback seguro.");
    return interpretarDadosEmpresa(null);
  }
}

export function obterLinkAvaliacaoGoogleComCache(): Promise<string | null> {
  return lerComCache("link-avaliacao-google", () => obterConfiguracao(CHAVE_CONFIG_LINK_AVALIACAO_GOOGLE));
}

export async function listarOpcoesCadastroOSComCache() {
  const [clientes, servicos] = await Promise.all([listarClientesCadastroOS(), listarServicosComCache()]);
  return {
    clientes,
    servicos: servicos.map(({ id, nome, precoBase }) => ({ id, nome, precoBase })),
  };
}

/** A escrita já foi concluída; falha na invalidação não muda sua resposta de sucesso. */
function invalidarRecurso(recurso: RecursoCache): void {
  const namespace = obterNamespace();
  if (!namespace) return;

  try {
    // Independe da flag: uma escrita durante o bypass também invalida entradas antigas.
    revalidateTag(tagDoRecurso(namespace, recurso));
  } catch (falha) {
    // Só nomes conhecidos são permitidos; mensagem, stack e payload não são registrados.
    const tipoErro = falha instanceof Error
      ? (TIPOS_ERRO_INVALIDACAO.has(falha.name) ? falha.name : "Error")
      : "Desconhecido";
    console.error("Falha ao invalidar cache de dados.", { recurso, tipoErro });
  }
}

export function invalidarCacheServicos(): void {
  invalidarRecurso("servicos");
}

export function invalidarCacheFormasPagamento(): void {
  invalidarRecurso("formas-pagamento");
}

export function invalidarCacheDadosEmpresa(): void {
  invalidarRecurso("dados-empresa");
}

export function invalidarCacheLinkAvaliacaoGoogle(): void {
  invalidarRecurso("link-avaliacao-google");
}
