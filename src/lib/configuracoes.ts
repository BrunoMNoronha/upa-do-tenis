import { prisma } from "@/lib/prisma";
import { CHAVE_CONFIG_LINK_AVALIACAO_GOOGLE } from "@/lib/configuracoes-schema";
import {
  CHAVE_CONFIG_DADOS_EMPRESA,
  DADOS_EMPRESA_PADRAO,
  clonarDadosEmpresa,
  dadosEmpresaSchema,
  type DadosEmpresa,
} from "@/lib/dados-empresa";

/**
 * Consulta uma configuração persistida no banco pela chave.
 * Retorna null se não estiver definida ou vazia.
 */
export async function obterConfiguracao(chave: string): Promise<string | null> {
  const registro = await prisma.configuracaoSistema.findUnique({
    where: { chave },
  });

  if (!registro || !registro.valor || registro.valor.trim() === "") {
    return null;
  }

  return registro.valor.trim();
}

/**
 * Salva ou atualiza uma configuração no banco pela chave (upsert atômico).
 * Se o valor for vazio, remove ou persiste vazio de forma segura.
 */
export async function salvarConfiguracao(chave: string, valor: string): Promise<void> {
  const valorNormalizado = valor.trim();

  await prisma.configuracaoSistema.upsert({
    where: { chave },
    update: { valor: valorNormalizado },
    create: { chave, valor: valorNormalizado },
  });
}

/**
 * Atalho tipado para obter o Link de Avaliação no Google.
 */
export async function obterLinkAvaliacaoGoogle(): Promise<string | null> {
  return obterConfiguracao(CHAVE_CONFIG_LINK_AVALIACAO_GOOGLE);
}

/**
 * Atalho tipado para salvar o Link de Avaliação no Google.
 */
export async function salvarLinkAvaliacaoGoogle(link: string | null): Promise<void> {
  await salvarConfiguracao(CHAVE_CONFIG_LINK_AVALIACAO_GOOGLE, link ?? "");
}

/**
 * Lê e valida o JSON institucional. Dados ausentes, legados ou corrompidos
 * nunca escapam para os consumidores e não tornam fluxos críticos indisponíveis.
 */
export async function obterDadosEmpresa(): Promise<DadosEmpresa> {
  try {
    const valor = await obterConfiguracao(CHAVE_CONFIG_DADOS_EMPRESA);
    if (!valor) return clonarDadosEmpresa(DADOS_EMPRESA_PADRAO);

    const resultado = dadosEmpresaSchema.safeParse(JSON.parse(valor));
    if (resultado.success) return resultado.data;

    console.error("Configuração dadosEmpresa inválida; usando fallback seguro.");
  } catch {
    console.error("Falha ao carregar dadosEmpresa; usando fallback seguro.");
  }

  return clonarDadosEmpresa(DADOS_EMPRESA_PADRAO);
}

export async function salvarDadosEmpresa(entrada: unknown): Promise<DadosEmpresa> {
  const dados = dadosEmpresaSchema.parse(entrada);
  await salvarConfiguracao(CHAVE_CONFIG_DADOS_EMPRESA, JSON.stringify(dados));
  return dados;
}
