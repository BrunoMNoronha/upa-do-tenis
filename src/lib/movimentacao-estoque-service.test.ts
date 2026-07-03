import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { 
  criarMovimentacaoEstoque, 
  TipoMovimentacao, 
  OrigemMovimentacao 
} from "./movimentacao-estoque-service";

const prisma = new PrismaClient();

describe("MovimentacaoEstoqueService", () => {
  let insumoId: string;

  beforeEach(async () => {
    const insumo = await prisma.insumo.create({
      data: {
        nome: "Insumo Teste Movimentação",
        unidadeMedida: "UN",
        quantidadeEstoque: 10,
        custoUnitario: 5.0,
      }
    });
    insumoId = insumo.id;
  });

  afterEach(async () => {
    await prisma.movimentacaoEstoqueInsumo.deleteMany({
      where: { insumoId }
    });
    await prisma.insumo.deleteMany({
      where: { id: insumoId }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deve criar entrada manual e aumentar o estoque (registrando saldo anterior e posterior)", async () => {
    const movimentacao = await criarMovimentacaoEstoque({
      insumoId,
      tipo: TipoMovimentacao.ENTRADA_MANUAL,
      origem: OrigemMovimentacao.MANUAL,
      quantidade: 5,
    });

    expect(movimentacao).toBeDefined();
    expect(Number(movimentacao.saldoAnterior)).toBe(10);
    expect(Number(movimentacao.saldoPosterior)).toBe(15);
    expect(Number(movimentacao.quantidade)).toBe(5);
    expect(Number(movimentacao.custoUnitario)).toBe(5);
    expect(Number(movimentacao.custoTotal)).toBe(25);

    const insumoAtualizado = await prisma.insumo.findUnique({ where: { id: insumoId }});
    expect(Number(insumoAtualizado?.quantidadeEstoque)).toBe(15);
  });

  it("deve criar saída manual e reduzir o estoque", async () => {
    const movimentacao = await criarMovimentacaoEstoque({
      insumoId,
      tipo: TipoMovimentacao.SAIDA_MANUAL,
      origem: OrigemMovimentacao.MANUAL,
      quantidade: 3,
    });

    expect(Number(movimentacao.saldoAnterior)).toBe(10);
    expect(Number(movimentacao.saldoPosterior)).toBe(7);

    const insumoAtualizado = await prisma.insumo.findUnique({ where: { id: insumoId }});
    expect(Number(insumoAtualizado?.quantidadeEstoque)).toBe(7);
  });

  it("deve impedir saída acima do saldo disponível", async () => {
    await expect(
      criarMovimentacaoEstoque({
        insumoId,
        tipo: TipoMovimentacao.SAIDA_MANUAL,
        origem: OrigemMovimentacao.MANUAL,
        quantidade: 15,
      })
    ).rejects.toThrow("Movimentação resultaria em estoque negativo");

    const insumoAtualizado = await prisma.insumo.findUnique({ where: { id: insumoId }});
    expect(Number(insumoAtualizado?.quantidadeEstoque)).toBe(10);
  });

  it("deve exigir motivo em movimentação de ajuste", async () => {
    await expect(
      criarMovimentacaoEstoque({
        insumoId,
        tipo: TipoMovimentacao.AJUSTE,
        origem: OrigemMovimentacao.AJUSTE_ESTOQUE,
        novoSaldo: 12,
      })
    ).rejects.toThrow("Motivo é obrigatório para movimentações de ajuste");
  });

  it("deve permitir ajuste quando motivo for informado", async () => {
    const movimentacao = await criarMovimentacaoEstoque({
      insumoId,
      tipo: TipoMovimentacao.AJUSTE,
      origem: OrigemMovimentacao.AJUSTE_ESTOQUE,
      novoSaldo: 12,
      motivo: "Recontagem de estoque",
    });

    expect(Number(movimentacao.saldoAnterior)).toBe(10);
    expect(Number(movimentacao.saldoPosterior)).toBe(12);
    expect(Number(movimentacao.quantidade)).toBe(2);

    const insumoAtualizado = await prisma.insumo.findUnique({ where: { id: insumoId }});
    expect(Number(insumoAtualizado?.quantidadeEstoque)).toBe(12);
  });

  it("deve calcular corretamente custoTotal", async () => {
    const movimentacao = await criarMovimentacaoEstoque({
      insumoId,
      tipo: TipoMovimentacao.ENTRADA_MANUAL,
      origem: OrigemMovimentacao.MANUAL,
      quantidade: 4,
      custoUnitario: 10,
    });

    expect(Number(movimentacao.custoUnitario)).toBe(10);
    expect(Number(movimentacao.custoTotal)).toBe(40);
  });

  it("deve garantir que falha na movimentação não altere o saldo do insumo (transacional)", async () => {
    await expect(
      criarMovimentacaoEstoque({
        insumoId,
        tipo: TipoMovimentacao.BAIXA_OS,
        origem: OrigemMovimentacao.ORDEM_SERVICO,
        quantidade: 100,
      })
    ).rejects.toThrow();

    const insumoAtualizado = await prisma.insumo.findUnique({ where: { id: insumoId }});
    expect(Number(insumoAtualizado?.quantidadeEstoque)).toBe(10);
  });
});
