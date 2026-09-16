import { describe, expect, it } from "vitest";

import {
  formatarDataEntradaParaNumeroOS,
  formatarNumeroOS,
  previaNumeroOS,
} from "@/lib/ordens-servico-numero";

describe("formatarNumeroOS", () => {
  it("compõe OS-<DDMMAAAA>-<numero> a partir da Data de Entrada e do número informado", () => {
    expect(formatarNumeroOS("2026-09-16", "0124")).toBe("OS-16092026-0124");
  });

  it("preserva zeros à esquerda do número informado", () => {
    expect(formatarNumeroOS("2026-09-16", "0001")).toBe("OS-16092026-0001");
    expect(formatarNumeroOS("2026-09-16", "007")).toBe("OS-16092026-007");
  });

  it("não impõe tamanho fixo ao número informado", () => {
    expect(formatarNumeroOS("2026-09-16", "1")).toBe("OS-16092026-1");
    expect(formatarNumeroOS("2026-09-16", "123456")).toBe("OS-16092026-123456");
  });

  it("usa a Data de Entrada retroativa, e não a data corrente", () => {
    expect(formatarNumeroOS("2026-09-01", "0124")).toBe("OS-01092026-0124");
  });

  it("não desloca a data por fuso horário (manipulação de string, sem Date)", () => {
    // Em fusos negativos, new Date("2026-01-01") voltaria para 31/12/2025.
    expect(formatarNumeroOS("2026-01-01", "0001")).toBe("OS-01012026-0001");
    expect(formatarDataEntradaParaNumeroOS("2025-12-31")).toBe("31122025");
  });

  it("remove espaços ao redor do número", () => {
    expect(formatarNumeroOS("2026-09-16", " 0124 ")).toBe("OS-16092026-0124");
  });

  it("rejeita número com caracteres não numéricos", () => {
    expect(() => formatarNumeroOS("2026-09-16", "12A")).toThrow();
    expect(() => formatarNumeroOS("2026-09-16", "")).toThrow();
    expect(() => formatarNumeroOS("2026-09-16", "01-24")).toThrow();
  });

  it("rejeita data fora do formato AAAA-MM-DD", () => {
    expect(() => formatarNumeroOS("16/09/2026", "0124")).toThrow();
    expect(() => formatarNumeroOS("", "0124")).toThrow();
  });
});

describe("previaNumeroOS", () => {
  it("retorna a prévia quando data e número estão completos", () => {
    expect(previaNumeroOS("2026-09-16", "0124")).toBe("OS-16092026-0124");
  });

  it("retorna null enquanto faltam dados ou o número é inválido", () => {
    expect(previaNumeroOS("2026-09-16", "")).toBeNull();
    expect(previaNumeroOS("2026-09-16", undefined)).toBeNull();
    expect(previaNumeroOS("", "0124")).toBeNull();
    expect(previaNumeroOS("2026-09-16", "12A")).toBeNull();
  });
});
