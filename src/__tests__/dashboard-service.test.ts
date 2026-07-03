import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardMetrics } from '../lib/dashboard-service';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  prisma: {
    pagamento: {
      aggregate: vi.fn(),
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

    const inicio = new Date('2026-07-01T00:00:00');
    const fim = new Date('2026-07-31T23:59:59');

    const metrics = await getDashboardMetrics(inicio, fim);

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
          dataPagamento: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });
});
