// Verificação do token de sessão compatível com o runtime Edge (middleware).
// Replica a validação de src/lib/auth-session.ts usando Web Crypto, pois o
// Edge runtime não expõe o módulo "crypto" do Node.
import { obterSegredoSessao } from "@/lib/auth-constants";

type SessaoPayload = {
  sub: string;
  exp: number;
};

function base64urlParaBytes(valor: string): Uint8Array<ArrayBuffer> | null {
  try {
    const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
    const preenchido = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binario = atob(preenchido);
    const bytes = new Uint8Array(binario.length);

    for (let i = 0; i < binario.length; i += 1) {
      bytes[i] = binario.charCodeAt(i);
    }

    return bytes;
  } catch {
    return null;
  }
}

export async function verificarTokenSessaoEdge(
  token: string,
  agoraMs = Date.now()
): Promise<SessaoPayload | null> {
  const partes = token.split(".");

  if (partes.length !== 2 || !partes[0] || !partes[1]) {
    return null;
  }

  const [payloadCodificado, assinatura] = partes;
  const assinaturaBytes = base64urlParaBytes(assinatura);
  const payloadBytes = base64urlParaBytes(payloadCodificado);

  if (!assinaturaBytes || !payloadBytes) {
    return null;
  }

  const codificador = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(obterSegredoSessao()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const assinaturaValida = await crypto.subtle.verify(
    "HMAC",
    chave,
    assinaturaBytes,
    codificador.encode(payloadCodificado)
  );

  if (!assinaturaValida) {
    return null;
  }

  let payload: SessaoPayload;

  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
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
