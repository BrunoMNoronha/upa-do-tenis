import { describe, expect, it } from "vitest";

import { APF, PREMISSAS, arredondarParaCima, calcularPrecos, totalPontosFuncao } from "./landing-precos";

describe("preço da landing por pontos de função", () => {
  it("soma 545 pontos de função", () => {
    expect(totalPontosFuncao()).toBe(545);
    expect(APF.arquivosInterfaceExterna).toBe(0);
  });

  it("valor de desenvolvimento é 545 PF × R$ 500 = R$ 272.500,00", () => {
    expect(calcularPrecos().valorDesenvolvimentoCentavos).toBe(27_250_000);
  });

  it("implantação amortiza em 20 lojas e arredonda para cima em R$ 100", () => {
    // 272.500 ÷ 20 = 13.625 → R$ 13.700
    expect(calcularPrecos().implantacaoCentavos).toBe(1_370_000);
  });

  it("assinatura = (infra + manutenção + suporte) ÷ (1 − margem), arredondada para cima em R$ 10", () => {
    const precos = calcularPrecos();

    // 272.500 × 15% ÷ 12 ÷ 20 = 170,3125 → 170,31
    expect(precos.manutencaoMensalPorLojaCentavos).toBe(17_031);
    // 200 + 170,31 + 100
    expect(precos.custoMensalPorLojaCentavos).toBe(47_031);
    // 470,31 ÷ 0,7 = 671,87… → 680
    expect(precos.assinaturaMensalCentavos).toBe(68_000);
  });

  it("margem é aplicada sobre o preço, não sobre o custo", () => {
    const precos = calcularPrecos();
    const semArredondamento = Math.ceil(precos.custoMensalPorLojaCentavos / (1 - PREMISSAS.margemFracao));

    // Preço sobre o custo (custo × 1,3) seria menor; a fórmula correta é custo ÷ 0,7.
    expect(semArredondamento).toBeGreaterThan(Math.round(precos.custoMensalPorLojaCentavos * 1.3));
    expect(precos.assinaturaMensalCentavos).toBeGreaterThanOrEqual(semArredondamento);
  });

  it("todos os valores são centavos inteiros e não negativos", () => {
    for (const valor of Object.values(calcularPrecos())) {
      expect(Number.isSafeInteger(valor)).toBe(true);
      expect(valor).toBeGreaterThanOrEqual(0);
    }
  });

  it("reage a premissas diferentes sem alterar a contagem", () => {
    const precos = calcularPrecos(APF, { ...PREMISSAS, lojasAlvo: 50 });

    expect(precos.totalPontosFuncao).toBe(545);
    // 272.500 ÷ 50 = 5.450 → próximo múltiplo de R$ 100 = R$ 5.500
    expect(precos.implantacaoCentavos).toBe(550_000);
    expect(precos.assinaturaMensalCentavos).toBeLessThan(calcularPrecos().assinaturaMensalCentavos);
  });

  it("arredondarParaCima sobe ao próximo múltiplo e recusa múltiplo inválido", () => {
    expect(arredondarParaCima(1_362_500, 10_000)).toBe(1_370_000);
    expect(arredondarParaCima(1_370_000, 10_000)).toBe(1_370_000);
    expect(arredondarParaCima(67_188, 1_000)).toBe(68_000);
    expect(() => arredondarParaCima(100, 0)).toThrow();
    expect(() => arredondarParaCima(100, 2.5)).toThrow();
  });
});
