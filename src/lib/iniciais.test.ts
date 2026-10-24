import { describe, expect, it } from "vitest";

import { iniciais } from "./iniciais";

describe("iniciais", () => {
  it("usa a primeira e a última palavra, ignorando partículas", () => {
    expect(iniciais("UPA do Tênis")).toBe("UT");
    expect(iniciais("Marcos Alves")).toBe("MA");
    expect(iniciais("Maria da Silva Souza")).toBe("MS");
  });

  it("devolve uma letra para nomes simples", () => {
    expect(iniciais("Ana")).toBe("A");
    expect(iniciais("  ana  ")).toBe("A");
  });

  it("devolve ? quando não há nome", () => {
    expect(iniciais("")).toBe("?");
    expect(iniciais("   ")).toBe("?");
    expect(iniciais(null)).toBe("?");
    expect(iniciais(undefined)).toBe("?");
  });

  it("respeita o máximo de letras", () => {
    expect(iniciais("Marcos Alves", 1)).toBe("M");
  });
});
