import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InsumoMovimentacaoError,
  listarMovimentacoesInsumo,
  registrarMovimentacaoManual,
} from "./insumos-movimentacoes";
import { criarMovimentacaoEstoque, TipoMovimentacao } from "./movimentacao-estoque-service";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    insumo: {
      findUnique: vi.fn(),
    },
    movimentacaoEstoqueInsumo: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/movimentacao-estoque-service", () => ({
  criarMovimentacaoEstoque: vi.fn(),
  TipoMovimentacao: {
    ENTRADA_MANUAL: "ENTRADA_MANUAL",
    SAIDA_MANUAL: "SAIDA_MANUAL",
    AJUSTE: "AJUSTE",
  },
  OrigemMovimentacao: {
    MANUAL: "MANUAL",
    AJUSTE_ESTOQUE: "AJUSTE_ESTOQUE"
  }
}));

describe("insumos-movimentacoes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listarMovimentacoesInsumo", () => {
    it("deve retornar insumo e suas movimentações", async () => {
      prismaMock.insumo.findUnique.mockResolvedValueOnce({ id: "ins-1", nome: "Cola" });
      prismaMock.movimentacaoEstoqueInsumo.findMany.mockResolvedValueOnce([
        { id: "mov-1", tipo: "ENTRADA_MANUAL" }
      ]);

      const resultado = await listarMovimentacoesInsumo("ins-1");
      expect(resultado.insumo.id).toBe("ins-1");
      expect(resultado.movimentacoes).toHaveLength(1);
    });

    it("deve falhar se insumo não existir", async () => {
      prismaMock.insumo.findUnique.mockResolvedValueOnce(null);

      await expect(listarMovimentacoesInsumo("ins-2")).rejects.toThrow(InsumoMovimentacaoError);
    });
  });

  describe("registrarMovimentacaoManual", () => {
    it("deve registrar entrada manual", async () => {
      prismaMock.insumo.findUnique.mockResolvedValueOnce({ id: "ins-1" });
      vi.mocked(criarMovimentacaoEstoque).mockResolvedValueOnce({
        id: "mov-new",
        tipo: "ENTRADA_MANUAL",
        saldoAnterior: 10,
        saldoPosterior: 15,
        quantidade: 5
      } as any);

      const resultado = await registrarMovimentacaoManual("ins-1", {
        tipo: TipoMovimentacao.ENTRADA_MANUAL,
        quantidade: 5,
      });

      expect(criarMovimentacaoEstoque).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "ENTRADA_MANUAL",
          origem: "MANUAL",
          quantidade: 5,
        })
      );
      expect(resultado.id).toBe("mov-new");
    });

    it("deve falhar para insumo inexistente", async () => {
      prismaMock.insumo.findUnique.mockResolvedValueOnce(null);

      await expect(
        registrarMovimentacaoManual("ins-fake", {
          tipo: TipoMovimentacao.ENTRADA_MANUAL,
          quantidade: 5,
        })
      ).rejects.toThrow(InsumoMovimentacaoError);
      
      expect(criarMovimentacaoEstoque).not.toHaveBeenCalled();
    });

    it("deve capturar erro de estoque insuficiente do service", async () => {
      prismaMock.insumo.findUnique.mockResolvedValueOnce({ id: "ins-1" });
      vi.mocked(criarMovimentacaoEstoque).mockRejectedValueOnce(new Error("Movimentação resultaria em estoque negativo"));

      await expect(
        registrarMovimentacaoManual("ins-1", {
          tipo: TipoMovimentacao.SAIDA_MANUAL,
          quantidade: 100,
        })
      ).rejects.toThrow(InsumoMovimentacaoError);
    });
  });
});
