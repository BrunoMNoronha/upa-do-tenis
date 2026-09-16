import { describe, expect, it } from "vitest";
import { calcularPrazoPrevistoPadrao } from "./ordens-servico-prazo";

describe("calcularPrazoPrevistoPadrao", () => {
  it("soma 5 dias sem contar domingos (quarta → terça seguinte)", () => {
    // 2026-09-16 é quarta; o domingo 20 não conta.
    expect(calcularPrazoPrevistoPadrao("2026-09-16")).toBe("2026-09-22");
  });

  it("segunda-feira sem domingo no caminho cai no sábado", () => {
    // 2026-09-14 é segunda: 15, 16, 17, 18, 19 (sábado).
    expect(calcularPrazoPrevistoPadrao("2026-09-14")).toBe("2026-09-19");
  });

  it("nunca termina em domingo", () => {
    // 2026-09-15 é terça: 16, 17, 18, 19, pula 20, 21 (segunda).
    expect(calcularPrazoPrevistoPadrao("2026-09-15")).toBe("2026-09-21");
  });

  it("entrada no domingo conta a partir da segunda", () => {
    // 2026-09-20 é domingo: 21, 22, 23, 24, 25.
    expect(calcularPrazoPrevistoPadrao("2026-09-20")).toBe("2026-09-25");
  });

  it("atravessa virada de mês e ano", () => {
    // 2026-12-30 é quarta: 31, 01/01 (sex), 02 (sáb), pula 03 (dom), 04, 05.
    expect(calcularPrazoPrevistoPadrao("2026-12-30")).toBe("2027-01-05");
  });

  it("aceita quantidade de dias personalizada e zero", () => {
    expect(calcularPrazoPrevistoPadrao("2026-09-16", 1)).toBe("2026-09-17");
    expect(calcularPrazoPrevistoPadrao("2026-09-16", 0)).toBe("2026-09-16");
  });

  it("retorna vazio para data inválida", () => {
    expect(calcularPrazoPrevistoPadrao("")).toBe("");
    expect(calcularPrazoPrevistoPadrao("abc")).toBe("");
  });
});
