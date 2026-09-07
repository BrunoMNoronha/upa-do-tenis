import { describe, expect, it } from "vitest";
import { sanitizeCPFCNPJ } from "./sanitizers";

describe("sanitizeCPFCNPJ", () => {
  it("deve retornar uma string vazia ao receber null", () => {
    expect(sanitizeCPFCNPJ(null)).toBe("");
  });

  it("deve retornar uma string vazia ao receber undefined", () => {
    expect(sanitizeCPFCNPJ(undefined)).toBe("");
  });

  it("deve retornar uma string vazia ao receber uma string vazia", () => {
    expect(sanitizeCPFCNPJ("")).toBe("");
  });

  it("deve remover a pontuação de um CPF formatado", () => {
    expect(sanitizeCPFCNPJ("123.456.789-00")).toBe("12345678900");
  });

  it("deve remover a pontuação de um CNPJ formatado", () => {
    expect(sanitizeCPFCNPJ("12.345.678/0001-99")).toBe("12345678000199");
  });

  it("deve remover letras e outros caracteres não numéricos", () => {
    expect(sanitizeCPFCNPJ("abc123def456!@#")).toBe("123456");
  });

  it("deve manter uma string apenas de números inalterada", () => {
    expect(sanitizeCPFCNPJ("12345678900")).toBe("12345678900");
  });
});
