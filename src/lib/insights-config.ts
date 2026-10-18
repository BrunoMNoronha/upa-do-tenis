import { z } from "zod";
import { obterConfiguracao, salvarConfiguracao } from "@/lib/configuracoes";
import { criptografarSegredo, descriptografarSegredo } from "@/lib/crypto-segredos";

/** Chave em `ConfiguracaoSistema`; o valor é sempre o texto cifrado. */
export const CHAVE_CONFIG_CLAUDE_API_KEY = "claudeApiKey";

const FORMATO_CHAVE_CLAUDE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

export const chaveClaudeSchema = z.object({
  apiKey: z
    .string({ required_error: "Informe a chave da API." })
    .trim()
    .regex(FORMATO_CHAVE_CLAUDE, "Chave inválida. Ela deve começar com \"sk-ant-\"."),
});

export interface StatusChaveClaude {
  configurada: boolean;
  /** Últimos 4 caracteres, para o operador identificar qual chave está salva. */
  ultimosQuatro: string | null;
}

export async function salvarChaveClaude(apiKey: string): Promise<StatusChaveClaude> {
  const chave = apiKey.trim();
  await salvarConfiguracao(CHAVE_CONFIG_CLAUDE_API_KEY, criptografarSegredo(chave));
  return { configurada: true, ultimosQuatro: chave.slice(-4) };
}

export async function removerChaveClaude(): Promise<void> {
  await salvarConfiguracao(CHAVE_CONFIG_CLAUDE_API_KEY, "");
}

/** Chave em claro para uso exclusivo no servidor; `null` se ausente ou ilegível. */
export async function obterChaveClaude(): Promise<string | null> {
  return descriptografarSegredo(await obterConfiguracao(CHAVE_CONFIG_CLAUDE_API_KEY));
}

export async function obterStatusChaveClaude(): Promise<StatusChaveClaude> {
  const chave = await obterChaveClaude();
  return chave
    ? { configurada: true, ultimosQuatro: chave.slice(-4) }
    : { configurada: false, ultimosQuatro: null };
}
