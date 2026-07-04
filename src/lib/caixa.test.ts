import { describe, it, expect, vi, beforeEach } from "vitest";
import { abrirCaixa, fecharCaixa, registrarMovimentacaoCaixa, obterCaixaAberto, CaixaError } from "./caixa";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    caixa: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    movimentacaoCaixa: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      return cb(prisma);
    }),
  },
}));

describe("Caixa Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("abrirCaixa", () => {
    it("deve abrir um caixa se não houver nenhum aberto", async () => {
      vi.mocked(prisma.caixa.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.caixa.create).mockResolvedValue({
        id: "caixa-1",
        saldoInicial: 100,
        observacao: "Teste",
      } as any);

      const result = await abrirCaixa({ saldoInicial: 100, observacao: "Teste" });
      
      expect(prisma.caixa.findFirst).toHaveBeenCalled();
      expect(prisma.caixa.create).toHaveBeenCalledWith({
        data: { saldoInicial: 100, observacao: "Teste" }
      });
      expect(result.id).toBe("caixa-1");
    });

    it("deve bloquear se já existir caixa aberto", async () => {
      vi.mocked(prisma.caixa.findFirst).mockResolvedValue({ id: "caixa-existente" } as any);

      await expect(abrirCaixa({ saldoInicial: 100 })).rejects.toThrow(CaixaError);
    });
  });

  describe("registrarMovimentacaoCaixa", () => {
    it("deve registrar movimentação se caixa estiver aberto", async () => {
      vi.mocked(prisma.caixa.findUnique).mockResolvedValue({ id: "caixa-1", status: "ABERTO" } as any);
      vi.mocked(prisma.movimentacaoCaixa.create).mockResolvedValue({ id: "mov-1", valor: 50 } as any);

      const result = await registrarMovimentacaoCaixa("caixa-1", {
        tipo: "SAIDA",
        valor: 50,
        descricao: "Lanche",
      });

      expect(prisma.movimentacaoCaixa.create).toHaveBeenCalled();
      expect(result.id).toBe("mov-1");
    });

    it("deve bloquear movimentação se caixa estiver fechado", async () => {
      vi.mocked(prisma.caixa.findUnique).mockResolvedValue({ id: "caixa-1", status: "FECHADO" } as any);

      await expect(
        registrarMovimentacaoCaixa("caixa-1", { tipo: "SAIDA", valor: 50, descricao: "Lanche" })
      ).rejects.toThrow(CaixaError);
    });
  });

  describe("obterCaixaAberto", () => {
    it("deve retornar o caixa e calcular os totais fisicos", async () => {
      vi.mocked(prisma.caixa.findFirst).mockResolvedValue({
        id: "caixa-1",
        saldoInicial: 100,
        status: "ABERTO",
        movimentacoes: [
          { tipo: "ENTRADA", valor: 50, formaPagamento: { nome: "DINHEIRO" } },
          { tipo: "SAIDA", valor: 20, formaPagamento: { nome: "DINHEIRO" } },
          { tipo: "ENTRADA", valor: 200, formaPagamento: { nome: "PIX" } } // Nao entra no fisico
        ]
      } as any);

      const result = await obterCaixaAberto();
      
      expect(result).toBeDefined();
      expect(result?.totais.saldoFisicoCalculado).toBe(130); // 100 + 50 - 20
      expect(result?.totais.totalGeralRecebido).toBe(230); // 50 (dinheiro) + 200 (pix) - 20 (saida dinheiro nao entra na receita geral mas ta como saida, na verdade a logica diz q subtrai no totaisPorFormaPagamento)
    });
  });

  describe("fecharCaixa", () => {
    it("deve fechar o caixa e calcular a divergência", async () => {
      vi.mocked(prisma.caixa.findUnique).mockResolvedValue({
        id: "caixa-1",
        status: "ABERTO",
        saldoInicial: 100,
        movimentacoes: [
          { tipo: "ENTRADA", valor: 50, formaPagamento: { nome: "DINHEIRO" } }
        ]
      } as any);

      vi.mocked(prisma.caixa.update).mockResolvedValue({ id: "caixa-1", status: "FECHADO" } as any);

      await fecharCaixa("caixa-1", { saldoFinalInformado: 140 });

      // saldo calculado seria 150. Informado 140. Divergencia = -10
      expect(prisma.caixa.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "caixa-1" },
        data: expect.objectContaining({
          status: "FECHADO",
          saldoFinalInformado: 140,
          saldoFinalCalculado: 150,
          divergencia: -10,
        })
      }));
    });
  });
});
