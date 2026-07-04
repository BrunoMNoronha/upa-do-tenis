import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./passwords";

describe("passwords", () => {
  it("gera hash diferente do texto puro", () => {
    const hash = hashPassword("senha-secreta");

    expect(hash).not.toContain("senha-secreta");
    expect(hash.startsWith("scrypt:")).toBe(true);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", () => {
    const hash1 = hashPassword("senha-secreta");
    const hash2 = hashPassword("senha-secreta");

    expect(hash1).not.toBe(hash2);
  });

  it("verifica senha correta", () => {
    const hash = hashPassword("senha-secreta");

    expect(verifyPassword("senha-secreta", hash)).toBe(true);
  });

  it("rejeita senha incorreta", () => {
    const hash = hashPassword("senha-secreta");

    expect(verifyPassword("senha-errada", hash)).toBe(false);
  });

  it("rejeita hash malformado", () => {
    expect(verifyPassword("qualquer", "texto-sem-formato")).toBe(false);
    expect(verifyPassword("qualquer", "")).toBe(false);
  });
});
