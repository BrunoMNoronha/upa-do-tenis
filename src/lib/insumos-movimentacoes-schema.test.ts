import { describe, expect, it } from "vitest";
import { registrarMovimentacaoManualSchema } from "./insumos-movimentacoes-schema";
import { TipoMovimentacao } from "./movimentacao-estoque-service";

describe("registrarMovimentacaoManualSchema", () => {
  describe("entrada manual", () => {
    it("aceita quantidade válida", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.ENTRADA_MANUAL,
        quantidade: 5,
      });

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.quantidade).toBe(5);
      }
    });

    it("aceita quantidade decimal", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.ENTRADA_MANUAL,
        quantidade: 0.5,
      });

      expect(resultado.success).toBe(true);
    });

    it("rejeita quantidade vazia com erro no campo quantidade", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.ENTRADA_MANUAL,
      });

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const campos = resultado.error.issues.map((i) => i.path.join("."));
        expect(campos).toContain("quantidade");
      }
    });

    it("trata NaN (input numérico vazio no client) como não informado, sem erro 'received nan'", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.ENTRADA_MANUAL,
        quantidade: NaN,
        custoUnitario: NaN,
        novoSaldo: NaN,
      });

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const mensagens = resultado.error.issues.map((i) => i.message.toLowerCase());
        expect(mensagens.some((m) => m.includes("nan"))).toBe(false);
        const campos = resultado.error.issues.map((i) => i.path.join("."));
        expect(campos).toContain("quantidade");
      }
    });

    it("trata null (NaN serializado em JSON) como não informado", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.ENTRADA_MANUAL,
        quantidade: 3,
        custoUnitario: null,
      });

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.custoUnitario).toBeUndefined();
      }
    });

    it("aceita custoUnitario opcional ausente sem bloquear o envio", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.ENTRADA_MANUAL,
        quantidade: 2,
        custoUnitario: NaN,
        observacao: "compra avulsa",
      });

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.custoUnitario).toBeUndefined();
        expect(resultado.data.quantidade).toBe(2);
      }
    });

    it("rejeita quantidade zero", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.ENTRADA_MANUAL,
        quantidade: 0,
      });

      expect(resultado.success).toBe(false);
    });
  });

  describe("saída manual", () => {
    it("aceita quantidade válida", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.SAIDA_MANUAL,
        quantidade: 1.25,
      });

      expect(resultado.success).toBe(true);
    });

    it("rejeita quantidade ausente", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.SAIDA_MANUAL,
        quantidade: NaN,
      });

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const campos = resultado.error.issues.map((i) => i.path.join("."));
        expect(campos).toContain("quantidade");
      }
    });
  });

  describe("ajuste de saldo", () => {
    it("aceita novoSaldo e motivo válidos", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.AJUSTE,
        novoSaldo: 12,
        motivo: "Contagem física",
      });

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.novoSaldo).toBe(12);
      }
    });

    it("aceita novoSaldo zero (zerar estoque)", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.AJUSTE,
        novoSaldo: 0,
        motivo: "Perda total",
      });

      expect(resultado.success).toBe(true);
    });

    it("rejeita ajuste sem novoSaldo com erro no campo novoSaldo", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.AJUSTE,
        novoSaldo: NaN,
        motivo: "Contagem física",
      });

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const campos = resultado.error.issues.map((i) => i.path.join("."));
        expect(campos).toContain("novoSaldo");
      }
    });

    it("rejeita ajuste sem motivo com erro no campo motivo", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.AJUSTE,
        novoSaldo: 10,
        motivo: "   ",
      });

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const campos = resultado.error.issues.map((i) => i.path.join("."));
        expect(campos).toContain("motivo");
      }
    });

    it("ignora quantidade residual NaN de campo oculto ao trocar o tipo", () => {
      const resultado = registrarMovimentacaoManualSchema.safeParse({
        tipo: TipoMovimentacao.AJUSTE,
        quantidade: NaN,
        novoSaldo: 8,
        motivo: "Ajuste após troca de tipo",
      });

      expect(resultado.success).toBe(true);
    });
  });
});
