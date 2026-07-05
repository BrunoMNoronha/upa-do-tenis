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
          { tipo: "ENTRADA", valor: 50, formaPagamento: { nome: "DINHEIRO", tipo: "DINHEIRO" } },
          { tipo: "SAIDA", valor: 20, formaPagamento: { nome: "DINHEIRO", tipo: "DINHEIRO" } },
          { tipo: "ENTRADA", valor: 200, formaPagamento: { nome: "PIX", tipo: "PIX" } } // Nao entra no fisico
        ]
      } as any);

      const result = await obterCaixaAberto();
      
      expect(result).toBeDefined();
      expect(result?.totais.saldoFisicoCalculado).toBe(130); // 100 + 50 - 20
      expect(result?.totais.totalGeralRecebido).toBe(230); // 50 (dinheiro) + 200 (pix) - 20 (saida dinheiro nao entra na receita geral mas ta como saida, na verdade a logica diz q subtrai no totaisPorFormaPagamento)
    });
  });

  describe("calcularTotaisCaixa - blindagem por formaPagamento.tipo", () => {
    it("considera físico uma forma com tipo DINHEIRO mesmo que o nome não seja 'Dinheiro'", async () => {
      vi.mocked(prisma.caixa.findFirst).mockResolvedValue({
        id: "caixa-1",
        saldoInicial: 100,
        status: "ABERTO",
        movimentacoes: [
          // Nome divergente ("Espécie"), mas tipo confiável DINHEIRO → entra no físico.
          { tipo: "ENTRADA", valor: 60, formaPagamento: { nome: "Espécie", tipo: "DINHEIRO" } },
        ],
      } as any);

      const result = await obterCaixaAberto();

      expect(result?.totais.entradasFisicas).toBe(60);
      expect(result?.totais.saldoFisicoCalculado).toBe(160); // 100 + 60
    });

    it("não considera físico uma forma cujo nome contém 'Dinheiro' mas o tipo não é DINHEIRO", async () => {
      vi.mocked(prisma.caixa.findFirst).mockResolvedValue({
        id: "caixa-1",
        saldoInicial: 100,
        status: "ABERTO",
        movimentacoes: [
          // Nome contém "Dinheiro" (armadilha do critério antigo), mas tipo é PIX.
          { tipo: "ENTRADA", valor: 70, formaPagamento: { nome: "Dinheiro Eletrônico", tipo: "PIX" } },
        ],
      } as any);

      const result = await obterCaixaAberto();

      expect(result?.totais.entradasFisicas).toBe(0);
      expect(result?.totais.saldoFisicoCalculado).toBe(100); // apenas saldo inicial
    });

    it("calcula corretamente um caixa com origens misturadas (PAGAMENTO_OS, VENDA_BALCAO, MANUAL)", async () => {
      vi.mocked(prisma.caixa.findFirst).mockResolvedValue({
        id: "caixa-1",
        saldoInicial: 100,
        status: "ABERTO",
        movimentacoes: [
          // 1. Pagamento de OS em dinheiro (nome divergente + tipo DINHEIRO) → físico.
          { tipo: "ENTRADA", valor: 50, origem: "PAGAMENTO_OS", formaPagamento: { nome: "Dinheiro Espécie", tipo: "DINHEIRO" } },
          // 2. Venda de balcão em PIX → fora do físico, entra no total por forma.
          { tipo: "ENTRADA", valor: 200, origem: "VENDA_BALCAO", formaPagamento: { nome: "PIX", tipo: "PIX" } },
          // 3. Pagamento de OS em cartão → fora do físico.
          { tipo: "ENTRADA", valor: 80, origem: "PAGAMENTO_OS", formaPagamento: { nome: "Cartão de Crédito", tipo: "CARTAO_CREDITO" } },
          // 4. Saída manual em dinheiro → reduz físico.
          { tipo: "SAIDA", valor: 20, origem: "MANUAL", formaPagamento: { nome: "Dinheiro", tipo: "DINHEIRO" } },
          // 5. Sangria (sem forma) → reduz físico, fora dos totais por forma.
          { tipo: "SANGRIA", valor: 30, origem: "MANUAL", formaPagamento: null },
          // 6. Reforço (sem forma) → soma no físico, fora dos totais por forma.
          { tipo: "REFORCO", valor: 10, origem: "MANUAL", formaPagamento: null },
          // 7. Entrada manual sem forma → dinheiro implícito (comportamento preservado).
          { tipo: "ENTRADA", valor: 40, origem: "MANUAL", formaPagamento: null },
        ],
      } as any);

      const result = await obterCaixaAberto();
      const t = result!.totais;

      // Físico: 100 + (50 + 40) - 20 - 30 + 10 = 150
      expect(t.entradasFisicas).toBe(90);
      expect(t.saidasFisicas).toBe(20);
      expect(t.sangrias).toBe(30);
      expect(t.reforcos).toBe(10);
      expect(t.saldoFisicoCalculado).toBe(150);

      // PIX e Cartão permanecem fora do físico, mas presentes nos totais por forma.
      expect(t.totaisPorFormaPagamento["PIX"]).toBe(200);
      expect(t.totaisPorFormaPagamento["CARTÃO DE CRÉDITO"]).toBe(80);
      expect(t.totaisPorFormaPagamento["DINHEIRO ESPÉCIE"]).toBe(50);
      // Entrada implícita (40, sem forma) agrupa sob DINHEIRO; saída (-20) também.
      expect(t.totaisPorFormaPagamento["DINHEIRO"]).toBe(20);
      // Sangria/reforço não entram nos totais por forma.
      expect(t.totalGeralRecebido).toBe(350); // 50 + 200 + 80 + 20
    });
  });

  describe("fecharCaixa", () => {
    it("deve fechar o caixa e calcular a divergência", async () => {
      vi.mocked(prisma.caixa.findUnique).mockResolvedValue({
        id: "caixa-1",
        status: "ABERTO",
        saldoInicial: 100,
        movimentacoes: [
          { tipo: "ENTRADA", valor: 50, formaPagamento: { nome: "DINHEIRO", tipo: "DINHEIRO" } }
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
