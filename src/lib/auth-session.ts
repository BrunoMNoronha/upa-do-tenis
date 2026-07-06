import { createHmac, timingSafeEqual } from "crypto";

import { obterSegredoSessao, SESSAO_DURACAO_SEGUNDOS } from "@/lib/auth-constants";

export { SESSAO_COOKIE_NOME, SESSAO_DURACAO_SEGUNDOS } from "@/lib/auth-constants";

type SessaoPayload = {
  sub: string;
  exp: number;
};

function assinar(payloadCodificado: string): string {
  return createHmac("sha256", obterSegredoSessao()).update(payloadCodificado).digest("base64url");
}

export function criarTokenSessao(usuarioId: string, agoraMs = Date.now()): string {
  const payload: SessaoPayload = {
    sub: usuarioId,
    exp: Math.floor(agoraMs / 1000) + SESSAO_DURACAO_SEGUNDOS,
  };

  const payloadCodificado = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${payloadCodificado}.${assinar(payloadCodificado)}`;
}

export function verificarTokenSessao(token: string, agoraMs = Date.now()): SessaoPayload | null {
  const partes = token.split(".");

  if (partes.length !== 2 || !partes[0] || !partes[1]) {
    return null;
  }

  const [payloadCodificado, assinatura] = partes;
  const assinaturaEsperada = assinar(payloadCodificado);
  const recebida = Buffer.from(assinatura, "base64url");
  const esperada = Buffer.from(assinaturaEsperada, "base64url");

  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) {
    return null;
  }

  let payload: SessaoPayload;

  try {
    payload = JSON.parse(Buffer.from(payloadCodificado, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload.sub !== "string" || payload.sub === "" || typeof payload.exp !== "number") {
    return null;
  }

  if (payload.exp <= Math.floor(agoraMs / 1000)) {
    return null;
  }

  return payload;
}
