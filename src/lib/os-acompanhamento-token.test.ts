import { afterEach, describe, expect, it, vi } from "vitest";

import { criarTokenSessao } from "@/lib/auth-session";
import {
  gerarTokenAcompanhamento,
  montarCaminhoAcompanhamento,
  verificarTokenAcompanhamento,
} from "@/lib/os-acompanhamento-token";

describe("token público de acompanhamento da OS", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("gera token verificável que devolve o id da OS", () => {
    const token = gerarTokenAcompanhamento("cmos123abc");

    expect(verificarTokenAcompanhamento(token)).toBe("cmos123abc");
  });

  it("é determinístico por OS e distinto entre OS diferentes", () => {
    const a = gerarTokenAcompanhamento("os-a");
    const b = gerarTokenAcompanhamento("os-b");

    expect(gerarTokenAcompanhamento("os-a")).toBe(a);
    expect(a).not.toBe(b);
    expect(a.split(".")[1]).not.toBe(b.split(".")[1]);
  });

  it("usa assinatura de alta entropia (256 bits) na URL", () => {
    const [, assinatura] = gerarTokenAcompanhamento("os-a").split(".");

    expect(Buffer.from(assinatura, "base64url")).toHaveLength(32);
    expect(montarCaminhoAcompanhamento("os-a")).toMatch(/^\/acompanhar\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  });

  it("não contém número da OS, nem dados pessoais ou financeiros", () => {
    const token = gerarTokenAcompanhamento("os-a");
    const [idCodificado] = token.split(".");

    expect(Buffer.from(idCodificado, "base64url").toString("utf8")).toBe("os-a");
  });

  it("rejeita número da OS ou id interno sem assinatura", () => {
    for (const tentativa of ["OS-05092026-0001", "os-a", Buffer.from("os-a").toString("base64url")]) {
      expect(verificarTokenAcompanhamento(tentativa), tentativa).toBeNull();
    }
  });

  it("rejeita assinatura de outra OS (troca do id mantendo a assinatura)", () => {
    const [, assinaturaDeA] = gerarTokenAcompanhamento("os-a").split(".");
    const idDeB = Buffer.from("os-b").toString("base64url");

    expect(verificarTokenAcompanhamento(`${idDeB}.${assinaturaDeA}`)).toBeNull();
  });

  it("rejeita token truncado, alterado, vazio ou malformado", () => {
    const token = gerarTokenAcompanhamento("os-a");
    const ultimo = token.at(-1) === "A" ? "B" : "A";

    for (const tentativa of [
      token.slice(0, -1),
      `${token.slice(0, -1)}${ultimo}`,
      `${token}A`,
      `x${token}`,
      token.replace(".", ""),
      `${token}.extra`,
      "",
      ".",
      "a".repeat(300),
    ]) {
      expect(verificarTokenAcompanhamento(tentativa), tentativa).toBeNull();
    }

    expect(verificarTokenAcompanhamento(null)).toBeNull();
    expect(verificarTokenAcompanhamento(undefined)).toBeNull();
  });

  it("rejeita variações do último caractere que decodificam na mesma assinatura", () => {
    const token = gerarTokenAcompanhamento("os-a");
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const indice = alfabeto.indexOf(token.at(-1)!);
    // Mesmos 6 bits exceto os 2 de preenchimento.
    const variantes = [0, 1, 2, 3]
      .map((bits) => alfabeto[(indice & ~3) | bits])
      .filter((caractere) => caractere !== token.at(-1));

    expect(variantes).toHaveLength(3);
    for (const caractere of variantes) {
      expect(verificarTokenAcompanhamento(`${token.slice(0, -1)}${caractere}`), caractere).toBeNull();
    }
  });

  it("não aceita token de sessão administrativa como token de acompanhamento", () => {
    expect(verificarTokenAcompanhamento(criarTokenSessao("os-a"))).toBeNull();
  });

  it("links deixam de valer quando o segredo dedicado é trocado (revogação global)", () => {
    vi.stubEnv("OS_ACOMPANHAMENTO_SECRET", "segredo-dedicado-antigo-123");
    const token = gerarTokenAcompanhamento("os-a");
    expect(verificarTokenAcompanhamento(token)).toBe("os-a");

    vi.stubEnv("OS_ACOMPANHAMENTO_SECRET", "segredo-dedicado-novo-456789");
    expect(verificarTokenAcompanhamento(token)).toBeNull();
  });
});
