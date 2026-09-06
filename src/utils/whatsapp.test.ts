import { describe, it, expect } from "vitest";
import { formatarNumeroWhatsApp, DDI_BRASIL } from "./whatsapp";

describe("formatarNumeroWhatsApp", () => {
  it("deve formatar corretamente um número com 11 dígitos", () => {
    expect(formatarNumeroWhatsApp("61987654321")).toBe(`${DDI_BRASIL}61987654321`);
  });

  it("deve formatar corretamente um número com 10 dígitos", () => {
    expect(formatarNumeroWhatsApp("6133334444")).toBe(`${DDI_BRASIL}6133334444`);
  });

  it("deve remover caracteres não numéricos e formatar corretamente", () => {
    expect(formatarNumeroWhatsApp("(61) 98765-4321")).toBe(`${DDI_BRASIL}61987654321`);
    expect(formatarNumeroWhatsApp("61 3333-4444")).toBe(`${DDI_BRASIL}6133334444`);
  });

  it("deve retornar null para números com menos de 10 dígitos", () => {
    expect(formatarNumeroWhatsApp("123456789")).toBeNull();
  });

  it("deve retornar null para números com mais de 11 dígitos", () => {
    expect(formatarNumeroWhatsApp("123456789012")).toBeNull();
  });

  it("deve retornar null para strings vazias", () => {
    expect(formatarNumeroWhatsApp("")).toBeNull();
  });

  it("deve retornar null se conter apenas caracteres não numéricos", () => {
    expect(formatarNumeroWhatsApp("abcdefg")).toBeNull();
  });
});
