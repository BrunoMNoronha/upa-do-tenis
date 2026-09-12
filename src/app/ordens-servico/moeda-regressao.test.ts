import { describe, expect, it } from "vitest";
import { currencyFormatter } from "./[id]/utils";
import { formatarMoeda } from "../vendas-balcao/venda-balcao-components";
import { formatCurrency } from "@/lib/formatters";

describe("compatibilidade dos formatadores monetários", () => {
  const anterior = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  it.each([0, -0, 0.01, 1.005, 1234.56, -12.34, 99999999.99, NaN, Infinity])("preserva a apresentação de %s", (valor) => {
    const esperado = anterior.format(valor);
    expect(currencyFormatter.format(valor)).toBe(esperado);
    expect(formatarMoeda(valor)).toBe(esperado);
    expect(formatCurrency(valor)).toBe(esperado);
  });
});
