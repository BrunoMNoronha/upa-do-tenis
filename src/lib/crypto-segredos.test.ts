import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { criptografarSegredo, descriptografarSegredo } from "./crypto-segredos";

const SEGREDO_ORIGINAL = process.env.AUTH_SESSION_SECRET;
const DEDICADO_ORIGINAL = process.env.INSIGHTS_CRYPTO_SECRET;

describe("crypto-segredos", () => {
  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = "segredo-de-teste-0123456789";
    delete process.env.INSIGHTS_CRYPTO_SECRET;
  });

  afterEach(() => {
    process.env.AUTH_SESSION_SECRET = SEGREDO_ORIGINAL;
    if (DEDICADO_ORIGINAL === undefined) delete process.env.INSIGHTS_CRYPTO_SECRET;
    else process.env.INSIGHTS_CRYPTO_SECRET = DEDICADO_ORIGINAL;
  });

  it("faz roundtrip e não expõe o texto em claro", () => {
    const chave = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz";
    const cifrado = criptografarSegredo(chave);

    expect(cifrado.startsWith("v1:")).toBe(true);
    expect(cifrado).not.toContain(chave);
    expect(descriptografarSegredo(cifrado)).toBe(chave);
  });

  it("gera valores diferentes para o mesmo texto (salt e IV aleatórios)", () => {
    expect(criptografarSegredo("abc")).not.toBe(criptografarSegredo("abc"));
  });

  it("devolve null quando o segredo mestre muda", () => {
    const cifrado = criptografarSegredo("segredo");
    process.env.AUTH_SESSION_SECRET = "outro-segredo-0123456789";

    expect(descriptografarSegredo(cifrado)).toBeNull();
  });

  it("prioriza INSIGHTS_CRYPTO_SECRET quando definida", () => {
    process.env.INSIGHTS_CRYPTO_SECRET = "segredo-dedicado-0123456789";
    const cifrado = criptografarSegredo("segredo");

    delete process.env.INSIGHTS_CRYPTO_SECRET;
    expect(descriptografarSegredo(cifrado)).toBeNull();

    process.env.INSIGHTS_CRYPTO_SECRET = "segredo-dedicado-0123456789";
    expect(descriptografarSegredo(cifrado)).toBe("segredo");
  });

  it("devolve null para valores ausentes, corrompidos ou adulterados", () => {
    const cifrado = criptografarSegredo("segredo");
    const partes = cifrado.split(":");
    const cifraAdulterada = Buffer.from(partes[4], "base64url");
    cifraAdulterada[0] ^= 0xff;
    partes[4] = cifraAdulterada.toString("base64url");

    expect(descriptografarSegredo(null)).toBeNull();
    expect(descriptografarSegredo("")).toBeNull();
    expect(descriptografarSegredo("texto-em-claro")).toBeNull();
    expect(descriptografarSegredo("v2:a:b:c:d")).toBeNull();
    expect(descriptografarSegredo(partes.join(":"))).toBeNull();
  });
});
