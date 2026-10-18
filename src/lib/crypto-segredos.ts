import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { obterSegredoSessao } from "@/lib/auth-constants";

/**
 * Criptografia simétrica de segredos guardados no banco (ex.: chave da
 * Claude API). AES-256-GCM com chave derivada por scrypt do segredo mestre e
 * salt aleatório por valor.
 *
 * Formato persistido: `v1:<salt>:<iv>:<tag>:<cifra>` (base64url).
 *
 * O segredo mestre é `INSIGHTS_CRYPTO_SECRET` ou, na ausência dela,
 * `AUTH_SESSION_SECRET`. Se o segredo mestre mudar, os valores antigos deixam
 * de ser legíveis: `descriptografarSegredo` devolve `null` e o operador
 * precisa cadastrar o segredo novamente.
 */

const VERSAO = "v1";
const TAMANHO_SALT = 16;
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

function obterSegredoMestre(): string {
  const dedicado = process.env.INSIGHTS_CRYPTO_SECRET?.trim();
  if (dedicado && dedicado.length >= 16) return dedicado;
  return obterSegredoSessao();
}

function derivarChave(segredoMestre: string, salt: Buffer): Buffer {
  return scryptSync(segredoMestre, salt, 32);
}

export function criptografarSegredo(texto: string): string {
  const salt = randomBytes(TAMANHO_SALT);
  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv("aes-256-gcm", derivarChave(obterSegredoMestre(), salt), iv);
  const cifra = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSAO, salt, iv, tag, cifra]
    .map((parte) => (typeof parte === "string" ? parte : parte.toString("base64url")))
    .join(":");
}

export function descriptografarSegredo(valor: string | null | undefined): string | null {
  if (!valor) return null;

  try {
    const partes = valor.split(":");
    if (partes.length !== 5 || partes[0] !== VERSAO) return null;

    const [salt, iv, tag, cifra] = partes.slice(1).map((parte) => Buffer.from(parte, "base64url"));
    if (salt.length !== TAMANHO_SALT || iv.length !== TAMANHO_IV || tag.length !== TAMANHO_TAG) {
      return null;
    }

    const decipher = createDecipheriv("aes-256-gcm", derivarChave(obterSegredoMestre(), salt), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(cifra), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
