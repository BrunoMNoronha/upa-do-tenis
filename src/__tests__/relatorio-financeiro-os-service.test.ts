import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  gerarRelatorioFinanceiroOS,
  LIMITE_ITENS_TABELA,
  LIMITE_UNIVERSO_AGREGACAO,
} from '../lib/relatorio-financeiro-os-service';
import { prisma } from '../lib/prisma';
import * as financeiroHelper from '../lib/ordens-servico-financeiro';

vi.mock('../lib/prisma', () => ({
  prisma: {
    ordemServico: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/ordens-servico-financeiro', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/ordens-servico-financeiro')>();
  return {
    ...actual,
    calcularResumoFinanceiroOS: vi.fn(),
  };
});

describe('Relatorio Financeiro OS Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOS = [
    {
      id: '1',
      numero: 'OS-001',
      cliente: { nome: 'João' },
      status: 'ABERTA',
      valorTotal: 100,
      valorDesconto: 0,
      valorSinal: 0,
      valorPago: 50,
      dataEntrada: new Date('2026-07-05T10:00:00Z'),
      dataPrevisao: new Date('2026-07-10T10:00:00Z'),
    },
    {
      id: '2',
      numero: 'OS-002',
      cliente: { nome: 'Maria' },
      status: 'ENTREGUE',
      valorTotal: 200,
      valorDesconto: 0,
      valorSinal: 0,
      valorPago: 200,
      dataEntrada: new Date('2026-07-06T10:00:00Z'),
      dataPrevisao: new Date('2026-07-11T10:00:00Z'),
    },
    {
      id: '3',
      numero: 'OS-003',
      cliente: { nome: 'Pedro' },
      status: 'EM_ANDAMENTO',
      valorTotal: 150,
      valorDesconto: 0,
      valorSinal: 0,
      valorPago: 0,
      dataEntrada: new Date('2026-07-01T10:00:00Z'),
      dataPrevisao: new Date('2026-07-02T10:00:00Z'), // Atrasada
    }
  ];

  it('deve rejeitar datas inválidas', async () => {
    await expect(gerarRelatorioFinanceiroOS({ inicio: 'xxx', fim: '2026-07-31' }))
      .rejects.toThrow('Datas inválidas.');
  });

  it('deve rejeitar data inicio maior que fim', async () => {
    await expect(gerarRelatorioFinanceiroOS({ inicio: '2026-07-31', fim: '2026-07-01' }))
      .rejects.toThrow('A data inicial não pode ser maior que a data final.');
  });

  it('deve gerar relatorio sem filtros extras corretamente', async () => {
    (prisma.ordemServico.findMany as any).mockResolvedValue(mockOS);
    
    (financeiroHelper.calcularResumoFinanceiroOS as any).mockImplementation((ordem: any) => {
      if (ordem.statusOperacional === 'ABERTA') return { valorTotal: 100, valorPago: 50, saldo: 50, statusFinanceiro: 'PARCIAL' };
      if (ordem.statusOperacional === 'ENTREGUE') return { valorTotal: 200, valorPago: 200, saldo: 0, statusFinanceiro: 'PAGO' };
      if (ordem.statusOperacional === 'EM_ANDAMENTO') return { valorTotal: 150, valorPago: 0, saldo: 150, statusFinanceiro: 'PENDENTE' };
      return {};
    });

    const result = await gerarRelatorioFinanceiroOS({ inicio: '2026-07-01', fim: '2026-07-31' });

    expect(prisma.ordemServico.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        dataEntrada: expect.objectContaining({
          gte: expect.any(Date),
          lt: expect.any(Date)
        })
      }),
      take: LIMITE_UNIVERSO_AGREGACAO + 1
    }));

    expect(result.itens).toHaveLength(3);
    expect(result.resumo.quantidadeOS).toBe(3);
    expect(result.resumo.valorTotal).toBe(450); // 100 + 200 + 150
    expect(result.resumo.valorPago).toBe(250); // 50 + 200 + 0
    expect(result.resumo.saldoAberto).toBe(200); // 50 + 0 + 150
    expect(result.resumo.quantidadeComSaldoAberto).toBe(2);

    // Agregados coerentes com o resumo
    expect(result.agregados.composicaoFinanceira).toEqual({ valorTotal: 450, valorPago: 250, saldoAberto: 200 });
    expect(result.agregados.porStatusFinanceiro).toEqual([
      { status: 'PENDENTE', quantidade: 1, valorTotal: 150 },
      { status: 'PARCIAL', quantidade: 1, valorTotal: 100 },
      { status: 'PAGO', quantidade: 1, valorTotal: 200 },
      { status: 'CANCELADO', quantidade: 0, valorTotal: 0 },
    ]);
    expect(result.agregados.porStatusOperacional.map(d => [d.status, d.quantidade])).toEqual([
      ['ABERTA', 1], ['EM_ANDAMENTO', 1], ['CONCLUIDA', 0], ['ENTREGUE', 1], ['CANCELADA', 0],
    ]);
    expect(result.tabela).toEqual({ limite: LIMITE_ITENS_TABELA, totalItens: 3, limitada: false });
    expect(result.agregacaoTruncada).toBe(false);

    const os3 = result.itens.find(i => i.numero === 'OS-003');
    expect(os3?.atrasada).toBe(true);
    
    const os2 = result.itens.find(i => i.numero === 'OS-002');
    expect(os2?.atrasada).toBe(false); // Entregue nunca é atrasada
  });

  it('deve montar intervalo que inclui OS criadas no próprio dia quando fim é hoje', async () => {
    (prisma.ordemServico.findMany as any).mockResolvedValue([]);

    const agora = new Date();
    const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

    await gerarRelatorioFinanceiroOS({ inicio: hojeStr, fim: hojeStr });

    const args = (prisma.ordemServico.findMany as any).mock.calls[0][0];
    const { gte, lt } = args.where.dataEntrada;

    // Intervalo semiaberto local: início de hoje <= agora < início de amanhã
    expect(gte.getTime()).toBeLessThanOrEqual(agora.getTime());
    expect(lt.getTime()).toBeGreaterThan(agora.getTime());

    // gte deve ser meia-noite local de hoje (não do dia anterior via UTC)
    expect(gte.getDate()).toBe(agora.getDate());
    expect(gte.getHours()).toBe(0);
  });

  it('deve montar intervalo local correto para datas YYYY-MM-DD', async () => {
    (prisma.ordemServico.findMany as any).mockResolvedValue([]);

    await gerarRelatorioFinanceiroOS({ inicio: '2026-07-01', fim: '2026-07-04' });

    const args = (prisma.ordemServico.findMany as any).mock.calls[0][0];
    const { gte, lt } = args.where.dataEntrada;

    expect(gte.getTime()).toBe(new Date(2026, 6, 1, 0, 0, 0, 0).getTime());
    expect(lt.getTime()).toBe(new Date(2026, 6, 5, 0, 0, 0, 0).getTime());

    // OS criada às 22h do dia final deve cair dentro do intervalo
    const osNoiteDoDiaFinal = new Date(2026, 6, 4, 22, 0);
    expect(osNoiteDoDiaFinal.getTime()).toBeGreaterThanOrEqual(gte.getTime());
    expect(osNoiteDoDiaFinal.getTime()).toBeLessThan(lt.getTime());
  });

  it('deve aplicar filtros de statusFinanceiro em memoria', async () => {
    (prisma.ordemServico.findMany as any).mockResolvedValue(mockOS);
    
    (financeiroHelper.calcularResumoFinanceiroOS as any).mockImplementation((ordem: any) => {
      if (ordem.statusOperacional === 'ABERTA') return { valorTotal: 100, valorPago: 50, saldo: 50, statusFinanceiro: 'PARCIAL' };
      if (ordem.statusOperacional === 'ENTREGUE') return { valorTotal: 200, valorPago: 200, saldo: 0, statusFinanceiro: 'PAGO' };
      if (ordem.statusOperacional === 'EM_ANDAMENTO') return { valorTotal: 150, valorPago: 0, saldo: 150, statusFinanceiro: 'PENDENTE' };
      return {};
    });

    const result = await gerarRelatorioFinanceiroOS({ inicio: '2026-07-01', fim: '2026-07-31', statusFinanceiro: 'PARCIAL' });

    expect(result.itens).toHaveLength(1);
    expect(result.itens[0].numero).toBe('OS-001');
    
    // Resumo deve considerar apenas o item filtrado
    expect(result.resumo.quantidadeOS).toBe(1);
    expect(result.resumo.valorTotal).toBe(100);
    expect(result.resumo.saldoAberto).toBe(50);

    // Gráficos refletem o mesmo conjunto filtrado
    expect(result.agregados.composicaoFinanceira).toEqual({ valorTotal: 100, valorPago: 50, saldoAberto: 50 });
    expect(result.agregados.porStatusFinanceiro.find(d => d.status === 'PARCIAL')?.quantidade).toBe(1);
    expect(result.agregados.porStatusFinanceiro.reduce((a, d) => a + d.quantidade, 0)).toBe(1);
    expect(result.agregados.porStatusOperacional.find(d => d.status === 'ABERTA')?.quantidade).toBe(1);
  });

  it('deve aplicar filtro saldoAberto=true em memoria', async () => {
    (prisma.ordemServico.findMany as any).mockResolvedValue(mockOS);
    
    (financeiroHelper.calcularResumoFinanceiroOS as any).mockImplementation((ordem: any) => {
      if (ordem.statusOperacional === 'ABERTA') return { valorTotal: 100, valorPago: 50, saldo: 50, statusFinanceiro: 'PARCIAL' };
      if (ordem.statusOperacional === 'ENTREGUE') return { valorTotal: 200, valorPago: 200, saldo: 0, statusFinanceiro: 'PAGO' };
      if (ordem.statusOperacional === 'EM_ANDAMENTO') return { valorTotal: 150, valorPago: 0, saldo: 150, statusFinanceiro: 'PENDENTE' };
      return {};
    });

    const result = await gerarRelatorioFinanceiroOS({ inicio: '2026-07-01', fim: '2026-07-31', saldoAberto: true });

    expect(result.itens).toHaveLength(2); // OS-001 e OS-003
    
    expect(result.resumo.quantidadeOS).toBe(2);
    expect(result.resumo.valorTotal).toBe(250);
    expect(result.agregados.porStatusFinanceiro.find(d => d.status === 'PAGO')?.quantidade).toBe(0);
    expect(result.agregados.composicaoFinanceira).toEqual({ valorTotal: 250, valorPago: 50, saldoAberto: 200 });
  });

  describe('universo maior que o limite da tabela', () => {
    const gerarLote = (quantidade: number) =>
      Array.from({ length: quantidade }, (_, i) => ({
        id: String(i + 1),
        numero: `OS-${String(i + 1).padStart(4, '0')}`,
        cliente: { nome: 'Cliente' },
        // alterna status: pares PAGO/ENTREGUE, ímpares PENDENTE/ABERTA
        status: i % 2 === 0 ? 'ENTREGUE' : 'ABERTA',
        valorTotal: 10,
        valorDesconto: 0,
        valorSinal: 0,
        valorPago: i % 2 === 0 ? 10 : 0,
        dataEntrada: new Date(2026, 6, 1 + (i % 28), 10, 0, 0),
        dataPrevisao: new Date(2026, 6, 28, 10, 0, 0),
      }));

    const mockFinanceiro = () => {
      (financeiroHelper.calcularResumoFinanceiroOS as any).mockImplementation((ordem: any) => {
        if (ordem.statusOperacional === 'ENTREGUE') return { valorTotal: 10, valorPago: 10, saldo: 0, statusFinanceiro: 'PAGO' };
        return { valorTotal: 10, valorPago: 0, saldo: 10, statusFinanceiro: 'PENDENTE' };
      });
    };

    it('resumo e gráficos cobrem todas as OS; tabela fica limitada a LIMITE_ITENS_TABELA', async () => {
      (prisma.ordemServico.findMany as any).mockResolvedValue(gerarLote(250));
      mockFinanceiro();

      const result = await gerarRelatorioFinanceiroOS({ inicio: '2026-07-01', fim: '2026-07-31' });

      expect(result.resumo.quantidadeOS).toBe(250);
      expect(result.resumo.valorTotal).toBe(2500);
      expect(result.resumo.valorPago).toBe(1250);
      expect(result.resumo.saldoAberto).toBe(1250);
      expect(result.agregados.porStatusFinanceiro.find(d => d.status === 'PAGO')?.quantidade).toBe(125);
      expect(result.agregados.porStatusFinanceiro.find(d => d.status === 'PENDENTE')?.quantidade).toBe(125);
      expect(result.agregados.porStatusOperacional.find(d => d.status === 'ENTREGUE')?.quantidade).toBe(125);
      expect(result.agregados.porStatusOperacional.find(d => d.status === 'ABERTA')?.quantidade).toBe(125);

      expect(result.itens).toHaveLength(LIMITE_ITENS_TABELA);
      expect(result.itens[0].numero).toBe('OS-0001'); // mantém a ordem devolvida pela consulta
      expect(result.tabela).toEqual({ limite: LIMITE_ITENS_TABELA, totalItens: 250, limitada: true });
      expect(result.agregacaoTruncada).toBe(false);
    });

    it('filtro derivado (statusFinanceiro) é aplicado ANTES da limitação da tabela', async () => {
      (prisma.ordemServico.findMany as any).mockResolvedValue(gerarLote(250));
      mockFinanceiro();

      const result = await gerarRelatorioFinanceiroOS({ inicio: '2026-07-01', fim: '2026-07-31', statusFinanceiro: 'PENDENTE' });

      expect(result.resumo.quantidadeOS).toBe(125);
      expect(result.resumo.saldoAberto).toBe(1250);
      expect(result.agregados.porStatusFinanceiro.find(d => d.status === 'PAGO')?.quantidade).toBe(0);
      expect(result.agregados.porStatusFinanceiro.find(d => d.status === 'PENDENTE')?.quantidade).toBe(125);
      expect(result.itens).toHaveLength(LIMITE_ITENS_TABELA);
      expect(result.itens.every(i => i.statusFinanceiro === 'PENDENTE')).toBe(true);
      expect(result.tabela.totalItens).toBe(125);
    });

    it('saldoAberto=true restringe resumo, gráficos e tabela ao mesmo universo', async () => {
      (prisma.ordemServico.findMany as any).mockResolvedValue(gerarLote(250));
      mockFinanceiro();

      const result = await gerarRelatorioFinanceiroOS({ inicio: '2026-07-01', fim: '2026-07-31', saldoAberto: true });

      expect(result.resumo.quantidadeOS).toBe(125);
      expect(result.resumo.quantidadeComSaldoAberto).toBe(125);
      expect(result.agregados.composicaoFinanceira).toEqual({ valorTotal: 1250, valorPago: 0, saldoAberto: 1250 });
      expect(result.itens.every(i => i.saldo > 0)).toBe(true);
      expect(result.tabela.totalItens).toBe(125);
    });

    it('sinaliza agregacaoTruncada quando o universo excede o teto de segurança', async () => {
      (prisma.ordemServico.findMany as any).mockResolvedValue(gerarLote(LIMITE_UNIVERSO_AGREGACAO + 1));
      mockFinanceiro();

      const result = await gerarRelatorioFinanceiroOS({ inicio: '2026-07-01', fim: '2026-07-31' });

      expect(result.agregacaoTruncada).toBe(true);
      expect(result.resumo.quantidadeOS).toBe(LIMITE_UNIVERSO_AGREGACAO);
      expect(result.itens).toHaveLength(LIMITE_ITENS_TABELA);
    });
  });
});
