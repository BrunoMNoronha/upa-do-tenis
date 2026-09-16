import { describe, it, expect } from 'vitest';
import {
  calcularAgregadosRelatorio,
  calcularResumoRelatorio,
  ItemAgregavel,
  STATUS_FINANCEIRO_ORDEM,
  STATUS_OPERACIONAL_ORDEM,
} from '../lib/relatorio-financeiro-os-agregacoes';

const item = (parcial: Partial<ItemAgregavel>): ItemAgregavel => ({
  statusOperacional: 'ABERTA',
  statusFinanceiro: 'PENDENTE',
  valorTotal: 0,
  valorPago: 0,
  saldo: 0,
  ...parcial,
});

describe('Agregações do Relatório Financeiro de OS', () => {
  const itens: ItemAgregavel[] = [
    item({ statusOperacional: 'ABERTA', statusFinanceiro: 'PENDENTE', valorTotal: 150, valorPago: 0, saldo: 150 }),
    item({ statusOperacional: 'EM_ANDAMENTO', statusFinanceiro: 'PARCIAL', valorTotal: 100, valorPago: 50, saldo: 50 }),
    item({ statusOperacional: 'ENTREGUE', statusFinanceiro: 'PAGO', valorTotal: 200, valorPago: 200, saldo: 0 }),
    item({ statusOperacional: 'CONCLUIDA', statusFinanceiro: 'PAGO', valorTotal: 80.1, valorPago: 80.1, saldo: 0 }),
    item({ statusOperacional: 'CANCELADA', statusFinanceiro: 'CANCELADO', valorTotal: 0, valorPago: 0, saldo: 0 }),
  ];

  it('resumo soma exatamente os valores já calculados pela regra financeira', () => {
    const resumo = calcularResumoRelatorio(itens);
    expect(resumo).toEqual({
      quantidadeOS: 5,
      valorTotal: 530.1,
      valorPago: 330.1,
      saldoAberto: 200,
      quantidadeComSaldoAberto: 2,
    });
  });

  it('conta OS por status financeiro na ordem fixa do domínio, sem reclassificar', () => {
    const { porStatusFinanceiro } = calcularAgregadosRelatorio(itens);
    expect(porStatusFinanceiro.map((d) => d.status)).toEqual(STATUS_FINANCEIRO_ORDEM);
    expect(porStatusFinanceiro).toEqual([
      { status: 'PENDENTE', quantidade: 1, valorTotal: 150 },
      { status: 'PARCIAL', quantidade: 1, valorTotal: 100 },
      { status: 'PAGO', quantidade: 2, valorTotal: 280.1 },
      { status: 'CANCELADO', quantidade: 1, valorTotal: 0 },
    ]);
  });

  it('conta OS por status operacional na ordem fixa do domínio', () => {
    const { porStatusOperacional } = calcularAgregadosRelatorio(itens);
    expect(porStatusOperacional.map((d) => d.status)).toEqual([...STATUS_OPERACIONAL_ORDEM]);
    expect(porStatusOperacional.map((d) => d.quantidade)).toEqual([1, 1, 1, 1, 1]);
  });

  it('composição financeira é coerente com o resumo (pago + saldo = valor total)', () => {
    const resumo = calcularResumoRelatorio(itens);
    const { composicaoFinanceira } = calcularAgregadosRelatorio(itens);
    expect(composicaoFinanceira.valorPago).toBe(resumo.valorPago);
    expect(composicaoFinanceira.saldoAberto).toBe(resumo.saldoAberto);
    expect(composicaoFinanceira.valorPago + composicaoFinanceira.saldoAberto).toBeCloseTo(resumo.valorTotal, 2);
  });

  it('a soma das contagens por status é igual à quantidade de OS', () => {
    const resumo = calcularResumoRelatorio(itens);
    const agregados = calcularAgregadosRelatorio(itens);
    const somaFin = agregados.porStatusFinanceiro.reduce((a, d) => a + d.quantidade, 0);
    const somaOp = agregados.porStatusOperacional.reduce((a, d) => a + d.quantidade, 0);
    expect(somaFin).toBe(resumo.quantidadeOS);
    expect(somaOp).toBe(resumo.quantidadeOS);
  });

  it('conjunto vazio devolve zeros com todas as categorias presentes', () => {
    const resumo = calcularResumoRelatorio([]);
    const agregados = calcularAgregadosRelatorio([]);
    expect(resumo.quantidadeOS).toBe(0);
    expect(agregados.composicaoFinanceira).toEqual({ valorPago: 0, saldoAberto: 0 });
    expect(agregados.porStatusFinanceiro).toHaveLength(4);
    expect(agregados.porStatusOperacional).toHaveLength(5);
    expect(agregados.porStatusFinanceiro.every((d) => d.quantidade === 0)).toBe(true);
  });

  it('status desconhecido é contado ao final, nunca descartado', () => {
    const agregados = calcularAgregadosRelatorio([item({ statusOperacional: 'OUTRO', statusFinanceiro: 'PAGO' })]);
    const outro = agregados.porStatusOperacional.find((d) => d.status === 'OUTRO');
    expect(outro?.quantidade).toBe(1);
    expect(agregados.porStatusOperacional.reduce((a, d) => a + d.quantidade, 0)).toBe(1);
  });
});
