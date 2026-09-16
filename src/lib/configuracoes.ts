import { prisma } from "@/lib/prisma";
import { CHAVE_CONFIG_LINK_AVALIACAO_GOOGLE } from "@/lib/configuracoes-schema";

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
