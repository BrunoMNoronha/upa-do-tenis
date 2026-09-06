import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { obterSegredoSessao } from "./auth-constants";

describe("obterSegredoSessao", () => {
  const envOriginal = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = "segredo-de-teste-valido-123456";
  });

  afterEach(() => {
    if (envOriginal !== undefined) {
      process.env.AUTH_SESSION_SECRET = envOriginal;
    } else {
      delete process.env.AUTH_SESSION_SECRET;
    }
  });

  it("retorna o segredo quando AUTH_SESSION_SECRET é válido (>= 16 caracteres)", () => {
    process.env.AUTH_SESSION_SECRET = "chave-secreta-de-teste-123456";
    expect(obterSegredoSessao()).toBe("chave-secreta-de-teste-123456");
  });

  it("lança erro quando AUTH_SESSION_SECRET não está definido", () => {
    delete process.env.AUTH_SESSION_SECRET;
    expect(() => obterSegredoSessao()).toThrow(
      "AUTH_SESSION_SECRET não configurado. Defina uma chave com pelo menos 16 caracteres."
    );
  });

  it("lança erro quando AUTH_SESSION_SECRET tem menos de 16 caracteres", () => {
    process.env.AUTH_SESSION_SECRET = "curto";
    expect(() => obterSegredoSessao()).toThrow(
      "AUTH_SESSION_SECRET não configurado. Defina uma chave com pelo menos 16 caracteres."
    );
  });
});
