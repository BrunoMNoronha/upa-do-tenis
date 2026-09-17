import { describe, expect, it } from "vitest";

import { CENTAVOS_MAXIMO, centavosParaDecimal, formatarCentavos, paraCentavos, somarCentavos } from "./centavos";

describe("paraCentavos", () => {
  it.each([
    ["150.50", 15050],
    ["150,5", 15050],
    ["150", 15000],
    ["0.01", 1],
    [" 15.90 ", 1590],
    [15.9, 1590],
    [100, 10000],
    ["0", 0],
  ])("converte %j em %i centavos", (entrada, esperado) => {
    expect(paraCentavos(entrada)).toBe(esperado);
  });

  it.each([
    ["-10"],
    [-10],
    ["10.001"],
    ["1.500,00"],
    ["R$ 10,00"],
    ["1e3"],
    [""],
    ["abc"],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [0.1 + 0.2],
    [null],
    [undefined],
    [{}],
    ["100000000.00"],
  ])("rejeita %j", (entrada) => {
    expect(paraCentavos(entrada)).toBeNull();
  });

  it("aceita o teto e rejeita acima dele", () => {
    expect(paraCentavos("99999999.99")).toBe(CENTAVOS_MAXIMO);
  });

  it("soma sem erro de ponto flutuante", () => {
    const soma = somarCentavos([paraCentavos("0.10")!, paraCentavos("0.20")!]);
    expect(soma).toBe(30);
    expect(centavosParaDecimal(soma)).toBe("0.30");
  });
});

describe("centavosParaDecimal", () => {
  it.each([
    [0, "0.00"],
    [1, "0.01"],
    [1590, "15.90"],
    [CENTAVOS_MAXIMO, "99999999.99"],
  ])("%i centavos → %s", (centavos, esperado) => {
    expect(centavosParaDecimal(centavos)).toBe(esperado);
  });

  it("rejeita fração e negativo", () => {
    expect(() => centavosParaDecimal(1.5)).toThrow();
    expect(() => centavosParaDecimal(-1)).toThrow();
  });
});

describe("formatarCentavos", () => {
  it("formata em BRL", () => {
    expect(formatarCentavos(15050).replace(/\s/g, " ")).toBe("R$ 150,50");
  });
});
