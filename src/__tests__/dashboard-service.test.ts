import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardMetrics } from '../lib/dashboard-service';
import { dataOperacionalHoje, inicioDoDiaOperacional } from '../lib/date-range';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  prisma: {
    // Transação em lote: executa as consultas (mockadas) e devolve os resultados.
    $transaction: vi.fn((operacoes: Promise<unknown>[]) => Promise.all(operacoes)),
    pagamento: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    ordemServico: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    servicoItemOrdem: {
      groupBy: vi.fn(),
    },
    servico: {
      findMany: vi.fn(),
    },
    insumoItemOrdem: {
      groupBy: vi.fn(),
    },
    insumo: {
      findMany: vi.fn(),
    },
  },
}));

describe('Dashboard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve calcular corretamente as métricas gerais com dados mockados', async () => {
    // Mocks
    (prisma.pagamento.aggregate as any).mockResolvedValue({ _sum: { valor: 5000 } });
    (prisma.pagamento.findMany as any).mockResolvedValue([]);
    (prisma.ordemServico.aggregate as any).mockImplementation((args: any) => {
      if (args._sum?.saldo) return Promise.resolve({ _sum: { saldo: 1500 } });
      if (args._avg?.valorTotal) return Promise.resolve({ _avg: { valorTotal: 300 } });
      return Promise.resolve({});
    });

    (prisma.ordemServico.groupBy as any).mockResolvedValue([
      { status: 'ABERTA', _count: { id: 10 } },
      { status: 'EM_ANDAMENTO', _count: { id: 5 } },
      { status: 'CONCLUIDA', _count: { id: 3 } },
      { status: 'ENTREGUE', _count: { id: 2 } },
    ]);

    (prisma.ordemServico.count as any).mockImplementation((args: any) => {
      if (args.where?.saldo === 0) return Promise.resolve(15); // pagas
      if (args.where?.valorPago === 0) return Promise.resolve(4); // pendentes
      if (args.where?.valorPago?.gt === 0) return Promise.resolve(1); // parcialmente
      return Promise.resolve(0);
    });

    (prisma.servicoItemOrdem.groupBy as any).mockResolvedValue([
      { servicoId: 's1', _count: { servicoId: 50 } },
      { servicoId: 's2', _count: { servicoId: 30 } },
    ]);
    (prisma.servico.findMany as any).mockResolvedValue([
      { id: 's1', nome: 'Troca de Sola' },
      { id: 's2', nome: 'Pintura' },
    ]);

    (prisma.insumoItemOrdem.groupBy as any).mockResolvedValue([
      { insumoId: 'i1', _sum: { quantidade: 100 } },
      { insumoId: 'i2', _sum: { quantidade: 50 } },
    ]);
    (prisma.insumo.findMany as any).mockResolvedValue([
      { id: 'i1', nome: 'Couro', unidadeMedida: 'm²' },
      { id: 'i2', nome: 'Tinta', unidadeMedida: 'ml' },
    ]);

    const metrics = await getDashboardMetrics('2026-07-01', '2026-07-31');

    // Validações
    expect(metrics.totalRecebido).toBe(5000);
    expect(metrics.totalPendente).toBe(1500);
    expect(metrics.osAbertas).toBe(10);
    expect(metrics.osEmAndamento).toBe(5);
    expect(metrics.osConcluidas).toBe(3);
    expect(metrics.osEntregues).toBe(2);
    expect(metrics.osPagas).toBe(15);
    expect(metrics.osPendentesPagamento).toBe(4);
    expect(metrics.osParcialmentePagas).toBe(1);
    expect(metrics.ticketMedio).toBe(300);

    expect(metrics.topServicos).toHaveLength(2);
    expect(metrics.topServicos[0].nome).toBe('Troca de Sola');
    expect(metrics.topServicos[0].quantidade).toBe(50);

    expect(metrics.topInsumos).toHaveLength(2);
    expect(metrics.topInsumos[0].nome).toBe('Couro (m²)');
    expect(metrics.topInsumos[0].quantidade).toBe(100);

    // Verifica se as datas foram passadas corretamente para o prisma
    expect(prisma.pagamento.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          // Dias completos em America/Sao_Paulo (UTC-3), qualquer que seja o TZ do processo.
          dataPagamento: {
            gte: new Date('2026-07-01T03:00:00.000Z'),
            lt: new Date('2026-08-01T03:00:00.000Z'),
          },
        }),
      })
    );
  });

  it('deve incluir registros criados no próprio dia quando dataFim é hoje', async () => {
    (prisma.pagamento.aggregate as any).mockResolvedValue({ _sum: { valor: 0 } });
    (prisma.pagamento.findMany as any).mockResolvedValue([]);
    (prisma.ordemServico.aggregate as any).mockResolvedValue({ _sum: { saldo: 0 }, _avg: { valorTotal: 0 } });
    (prisma.ordemServico.groupBy as any).mockResolvedValue([]);
    (prisma.ordemServico.count as any).mockResolvedValue(0);
    (prisma.servicoItemOrdem.groupBy as any).mockResolvedValue([]);
    (prisma.servico.findMany as any).mockResolvedValue([]);
    (prisma.insumoItemOrdem.groupBy as any).mockResolvedValue([]);
    (prisma.insumo.findMany as any).mockResolvedValue([]);

    const agora = new Date();
    const hoje = dataOperacionalHoje(agora);
    await getDashboardMetrics(hoje, hoje);

    const args = (prisma.pagamento.aggregate as any).mock.calls[0][0];
    const { gte, lt } = args.where.dataPagamento;

    // Intervalo semiaberto: início de hoje <= agora < início de amanhã
    expect(gte.getTime()).toBeLessThanOrEqual(agora.getTime());
    expect(lt.getTime()).toBeGreaterThan(agora.getTime());
    expect(gte.getTime()).toBe(inicioDoDiaOperacional(agora).getTime());
    expect(dataOperacionalHoje(lt)).not.toBe(hoje);
  });

  function mockarAgregacoesVazias() {
    (prisma.pagamento.aggregate as any).mockResolvedValue({ _sum: { valor: 0 } });
    (prisma.ordemServico.aggregate as any).mockResolvedValue({ _sum: { saldo: 0 }, _avg: { valorTotal: 0 } });
    (prisma.ordemServico.groupBy as any).mockResolvedValue([]);
    (prisma.ordemServico.count as any).mockResolvedValue(0);
    (prisma.servicoItemOrdem.groupBy as any).mockResolvedValue([]);
    (prisma.servico.findMany as any).mockResolvedValue([]);
    (prisma.insumoItemOrdem.groupBy as any).mockResolvedValue([]);
    (prisma.insumo.findMany as any).mockResolvedValue([]);
  }

  it('monta recebimentosPorDia com o mesmo filtro do total recebido', async () => {
    mockarAgregacoesVazias();
    (prisma.pagamento.findMany as any).mockResolvedValue([
      { dataPagamento: new Date('2026-07-01T22:30:00-03:00'), valor: 30 },
      { dataPagamento: new Date('2026-07-03T09:00:00-03:00'), valor: 12.5 },
    ]);

    const metrics = await getDashboardMetrics('2026-07-01', '2026-07-03');

    // Total e série no mesmo snapshot.
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), { isolationLevel: 'RepeatableRead' });
    expect(prisma.pagamento.findMany).toHaveBeenCalledWith({
      where: { dataPagamento: { gte: new Date('2026-07-01T03:00:00.000Z'), lt: new Date('2026-07-04T03:00:00.000Z') } },
      select: { dataPagamento: true, valor: true },
    });
    expect(metrics.recebimentosPorDia).toEqual([
      { dia: '2026-07-01', valor: 30 },
      { dia: '2026-07-02', valor: 0 },
      { dia: '2026-07-03', valor: 12.5 },
    ]);
  });

  it('devolve recebimentosPorDia null e não busca pagamentos quando o período passa do limite', async () => {
    mockarAgregacoesVazias();

    const metrics = await getDashboardMetrics('2026-01-01', '2026-12-31');

    expect(metrics.recebimentosPorDia).toBeNull();
    expect(prisma.pagamento.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
