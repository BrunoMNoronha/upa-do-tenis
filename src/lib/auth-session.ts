import { createHmac, timingSafeEqual } from "crypto";

export const SESSAO_COOKIE_NOME = "upa_sessao";
export const SESSAO_DURACAO_SEGUNDOS = 8 * 60 * 60;

type SessaoPayload = {
  sub: string;
  exp: number;
};

function obterSegredo(): string {
  const segredo = process.env.AUTH_SESSION_SECRET;

  if (segredo && segredo.length >= 16) {
    return segredo;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SESSION_SECRET não configurado. Defina uma chave com pelo menos 16 caracteres."
    );
  }

  return "upa-do-tenis-segredo-dev";
}

function assinar(payloadCodificado: string): string {
  return createHmac("sha256", obterSegredo()).update(payloadCodificado).digest("base64url");
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
