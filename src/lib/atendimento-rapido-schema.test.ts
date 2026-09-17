import { describe, expect, it } from "vitest";

import { registrarAtendimentoRapidoSchema } from "./atendimento-rapido-schema";

const CHAVE = "7d0e1a0c-5a47-4a5c-9c1e-6f7d3c1b2a90";

function entrada(sobrescrever: Record<string, unknown> = {}) {
  return {
    chaveIdempotencia: CHAVE,
    itens: [
      { servicoId: "srv-1", valor: "50.00" },
      { servicoId: "srv-1", valor: "50.00" },
    ],
    pagamentos: [{ formaPagamentoId: "pix", valor: "100.00" }],
    ...sobrescrever,
  };
}

function mensagens(resultado: ReturnType<typeof registrarAtendimentoRapidoSchema.safeParse>) {
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
}

describe("registrarAtendimentoRapidoSchema", () => {
  it("aceita payload válido e converte valores para centavos", () => {
    const resultado = registrarAtendimentoRapidoSchema.parse(entrada({ observacoes: "  " }));
    expect(resultado).toEqual({
      chaveIdempotencia: CHAVE,
      observacoes: undefined,
      itens: [
        { servicoId: "srv-1", valorCentavos: 5000 },
        { servicoId: "srv-1", valorCentavos: 5000 },
      ],
      pagamentos: [{ formaPagamentoId: "pix", valorCentavos: 10000 }],
    });
  });

  it("aceita pagamento dividido que soma exatamente o total", () => {
    const resultado = registrarAtendimentoRapidoSchema.safeParse(
      entrada({
        pagamentos: [
          { formaPagamentoId: "pix", valor: "60.00" },
          { formaPagamentoId: "dinheiro", valor: "40.00" },
        ],
      }),
    );
    expect(resultado.success).toBe(true);
  });

  it("aceita múltiplos serviços com preço sobrescrito em centavos exatos", () => {
    const resultado = registrarAtendimentoRapidoSchema.safeParse(
      entrada({
        itens: [
          { servicoId: "srv-1", valor: "99.99" },
          { servicoId: "srv-2", valor: 0.01 },
        ],
        pagamentos: [{ formaPagamentoId: "pix", valor: "100.00" }],
      }),
    );
    expect(resultado.success).toBe(true);
  });

  it("rejeita soma dos pagamentos menor que o total", () => {
    const resultado = registrarAtendimentoRapidoSchema.safeParse(
      entrada({ pagamentos: [{ formaPagamentoId: "pix", valor: "99.99" }] }),
    );
    expect(mensagens(resultado).join()).toMatch(/soma dos pagamentos .* deve ser igual ao total/);
  });

  it("rejeita soma dos pagamentos maior que o total", () => {
    const resultado = registrarAtendimentoRapidoSchema.safeParse(
      entrada({
        pagamentos: [
          { formaPagamentoId: "pix", valor: "60.00" },
          { formaPagamentoId: "dinheiro", valor: "40.01" },
        ],
      }),
    );
    expect(resultado.success).toBe(false);
  });

  it.each([
    ["valor do serviço zero", { itens: [{ servicoId: "srv-1", valor: "0" }] }],
    ["valor do serviço negativo", { itens: [{ servicoId: "srv-1", valor: "-50" }] }],
    ["valor com 3 casas", { itens: [{ servicoId: "srv-1", valor: "50.001" }] }],
    ["serviço sem valor", { itens: [{ servicoId: "srv-1" }] }],
    ["pagamento zero", { pagamentos: [{ formaPagamentoId: "pix", valor: "0.00" }] }],
    ["pagamento negativo", { pagamentos: [{ formaPagamentoId: "pix", valor: -100 }] }],
    ["sem serviços", { itens: [] }],
    ["sem pagamentos", { pagamentos: [] }],
    ["forma de pagamento repetida", {
      pagamentos: [
        { formaPagamentoId: "pix", valor: "50.00" },
        { formaPagamentoId: "pix", valor: "50.00" },
      ],
    }],
    ["chave de idempotência ausente", { chaveIdempotencia: undefined }],
    ["chave de idempotência inválida", { chaveIdempotencia: "123" }],
    ["observação longa", { observacoes: "x".repeat(501) }],
  ])("rejeita %s", (_caso, sobrescrever) => {
    expect(registrarAtendimentoRapidoSchema.safeParse(entrada(sobrescrever)).success).toBe(false);
  });

  it("ignora campos de total, código ou cliente enviados pelo navegador", () => {
    const resultado = registrarAtendimentoRapidoSchema.parse(
      entrada({ valorTotal: 1, codigo: "AR-01012020-0001", clienteId: "c1", status: "PAGO" }),
    );
    expect(resultado).not.toHaveProperty("valorTotal");
    expect(resultado).not.toHaveProperty("codigo");
    expect(resultado).not.toHaveProperty("clienteId");
    expect(resultado).not.toHaveProperty("status");
  });
});
