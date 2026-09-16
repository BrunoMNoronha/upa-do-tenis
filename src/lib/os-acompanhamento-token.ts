import { createHmac, timingSafeEqual } from "node:crypto";

import { obterSegredoSessao } from "@/lib/auth-constants";

/**
 * Token do link público de acompanhamento da Ordem de Serviço.
 *
 * Formato: `<base64url(id da OS)>.<base64url(HMAC-SHA256)>`. O número da OS e
 * o id interno sozinhos NÃO dão acesso: sem a assinatura (256 bits, gerada
 * com segredo server-side) o token é rejeitado antes de qualquer consulta ao
 * banco, o que impede enumeração alterando a URL.
 *
 * Não há persistência (sem alteração de schema). Consequência conhecida: não
 * é possível revogar o link de UMA OS isoladamente. A revogação é global,
 * trocando `OS_ACOMPANHAMENTO_SECRET` (invalida todos os links já enviados).
 */

const CONTEXTO_ASSINATURA = "upa:os-acompanhamento:v1";
const TAMANHO_MAXIMO_TOKEN = 256;
const FORMATO_TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;

export const CAMINHO_ACOMPANHAMENTO = "/acompanhar";

function obterSegredoAcompanhamento(): Buffer {
  const dedicado = process.env.OS_ACOMPANHAMENTO_SECRET;

  if (dedicado && dedicado.length >= 16) {
    return Buffer.from(dedicado, "utf8");
  }

  // Sem segredo dedicado, deriva uma chave própria do segredo da sessão
  // (separação de domínio): o token de acompanhamento nunca é aceito como
  // sessão, nem o inverso.
  return createHmac("sha256", obterSegredoSessao()).update(CONTEXTO_ASSINATURA).digest();
}

function assinar(ordemServicoId: string): Buffer {
  return createHmac("sha256", obterSegredoAcompanhamento())
    .update(`${CONTEXTO_ASSINATURA}:${ordemServicoId}`)
    .digest();
}

export function gerarTokenAcompanhamento(ordemServicoId: string): string {
  if (!ordemServicoId) {
    throw new Error("Id da ordem de serviço é obrigatório para gerar o token de acompanhamento.");
  }

  const idCodificado = Buffer.from(ordemServicoId, "utf8").toString("base64url");
  return `${idCodificado}.${assinar(ordemServicoId).toString("base64url")}`;
}

/** Retorna o id da OS quando a assinatura confere; `null` para qualquer token inválido. */
export function verificarTokenAcompanhamento(token: string | null | undefined): string | null {
  if (typeof token !== "string" || token.length > TAMANHO_MAXIMO_TOKEN || !FORMATO_TOKEN.test(token)) {
    return null;
  }

  const [idCodificado, assinaturaCodificada] = token.split(".");
  const ordemServicoId = Buffer.from(idCodificado, "base64url").toString("utf8");

  // Rejeita codificações não canônicas (bytes extras que decodificam no mesmo id).
  if (!ordemServicoId || Buffer.from(ordemServicoId, "utf8").toString("base64url") !== idCodificado) {
    return null;
  }

  const recebida = Buffer.from(assinaturaCodificada, "base64url");
  const esperada = assinar(ordemServicoId);

  // O último caractere base64url de 32 bytes tem 2 bits de preenchimento: sem
  // esta checagem, variações desse caractere seriam aceitas como o mesmo link.
  if (
    recebida.length !== esperada.length ||
    recebida.toString("base64url") !== assinaturaCodificada ||
    !timingSafeEqual(recebida, esperada)
  ) {
    return null;
  }

  return ordemServicoId;
}

export function montarCaminhoAcompanhamento(ordemServicoId: string): string {
  return `${CAMINHO_ACOMPANHAMENTO}/${gerarTokenAcompanhamento(ordemServicoId)}`;
}
