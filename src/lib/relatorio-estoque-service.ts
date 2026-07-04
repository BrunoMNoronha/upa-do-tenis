import { prisma } from './prisma';
import { TipoMovimentacao, OrigemMovimentacao } from './movimentacao-estoque-service';
import { Prisma } from '@prisma/client';
import { inicioDoDia, inicioDoDiaSeguinte } from './date-range';

export interface RelatorioEstoqueEstatisticas {
  totalInsumosAtivos: number;
  totalInsumosZerados: number;
  totalInsumosAbaixoMinimo: number;
  valorTotalEstimado: number;
}

export interface InsumoCritico {
  id: string;
  nome: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  status: 'ZERADO' | 'ABAIXO_MINIMO';
}

export interface FiltrosMovimentacao {
  dataInicio?: Date;
  dataFim?: Date;
  tipo?: TipoMovimentacao;
  origem?: OrigemMovimentacao;
  insumoId?: string;
}

export interface MovimentacaoResumo {
  id: string;
  dataMovimentacao: Date;
  tipo: TipoMovimentacao;
  quantidade: number;
  custoTotal: number;
  origem: OrigemMovimentacao;
  insumo: {
    id: string;
    nome: string;
    unidadeMedida: string;
  };
  observacao?: string | null;
  motivo?: string | null;
}

export interface ResumoPorTipo {
  tipo: TipoMovimentacao;
  quantidadeTotal: number;
  custoTotal: number;
}

export async function getEstatisticasGlobaisEstoque(): Promise<RelatorioEstoqueEstatisticas> {
  const insumos = await prisma.insumo.findMany({
    select: {
      quantidadeEstoque: true,
      estoqueMinimo: true,
      custoUnitario: true,
    }
  });

  let totalInsumosAtivos = insumos.length;
  let totalInsumosZerados = 0;
  let totalInsumosAbaixoMinimo = 0;
  let valorTotalEstimadoDecimal = new Prisma.Decimal(0);

  for (const insumo of insumos) {
    const qtd = Number(insumo.quantidadeEstoque);
    const min = Number(insumo.estoqueMinimo);
    
    // Regra: Zerado (qtd === 0), Abaixo do mínimo (qtd > 0 && qtd < min)
    if (qtd === 0) {
      totalInsumosZerados++;
    } else if (qtd < min) {
      totalInsumosAbaixoMinimo++;
    }

    // Calcula valor estimado (qtd * custo)
    const valorEstimadoItem = insumo.quantidadeEstoque.mul(insumo.custoUnitario);
    valorTotalEstimadoDecimal = valorTotalEstimadoDecimal.add(valorEstimadoItem);
  }

  return {
    totalInsumosAtivos,
    totalInsumosZerados,
    totalInsumosAbaixoMinimo,
    valorTotalEstimado: Number(valorTotalEstimadoDecimal),
  };
}

export async function getListaInsumosCriticos(): Promise<InsumoCritico[]> {
  const insumos = await prisma.insumo.findMany({
    where: {
      OR: [
        { quantidadeEstoque: 0 },
        {
          quantidadeEstoque: {
            lt: prisma.insumo.fields.estoqueMinimo
          }
        }
      ]
    },
    select: {
      id: true,
      nome: true,
      unidadeMedida: true,
      quantidadeEstoque: true,
      estoqueMinimo: true,
    },
    orderBy: {
      nome: 'asc'
    }
  });

  return insumos.map(i => {
    const qtd = Number(i.quantidadeEstoque);
    const min = Number(i.estoqueMinimo);
    const status = qtd === 0 ? 'ZERADO' : 'ABAIXO_MINIMO';

    return {
      id: i.id,
      nome: i.nome,
      unidadeMedida: i.unidadeMedida,
      quantidadeEstoque: qtd,
      estoqueMinimo: min,
      status,
    };
  });
}

export async function getExtratoMovimentacoes(filtros?: FiltrosMovimentacao, limite: number = 50): Promise<MovimentacaoResumo[]> {
  const where: Prisma.MovimentacaoEstoqueInsumoWhereInput = {};

  if (filtros?.dataInicio || filtros?.dataFim) {
    where.criadoEm = {};
    if (filtros.dataInicio) {
      where.criadoEm.gte = inicioDoDia(filtros.dataInicio);
    }
    if (filtros.dataFim) {
      where.criadoEm.lt = inicioDoDiaSeguinte(filtros.dataFim);
    }
  }

  if (filtros?.tipo) {
    where.tipo = filtros.tipo;
  }
  
  if (filtros?.origem) {
    where.origem = filtros.origem;
  }

  if (filtros?.insumoId) {
    where.insumoId = filtros.insumoId;
  }

  const movimentacoes = await prisma.movimentacaoEstoqueInsumo.findMany({
    where,
    orderBy: {
      criadoEm: 'desc'
    },
    take: limite,
    include: {
      insumo: {
        select: {
          id: true,
          nome: true,
          unidadeMedida: true,
        }
      }
    }
  });

  return movimentacoes.map(m => ({
    id: m.id,
    dataMovimentacao: m.criadoEm,
    tipo: m.tipo as TipoMovimentacao,
    quantidade: Number(m.quantidade),
    custoTotal: Number(m.custoTotal),
    origem: m.origem as OrigemMovimentacao,
    insumo: {
      id: m.insumo.id,
      nome: m.insumo.nome,
      unidadeMedida: m.insumo.unidadeMedida,
    },
    observacao: m.observacao,
    motivo: m.motivo,
  }));
}

export async function getResumoPorTipo(filtros?: FiltrosMovimentacao): Promise<ResumoPorTipo[]> {
  const where: Prisma.MovimentacaoEstoqueInsumoWhereInput = {};

  if (filtros?.dataInicio || filtros?.dataFim) {
    where.criadoEm = {};
    if (filtros.dataInicio) {
      where.criadoEm.gte = inicioDoDia(filtros.dataInicio);
    }
    if (filtros.dataFim) {
      where.criadoEm.lt = inicioDoDiaSeguinte(filtros.dataFim);
    }
  }

  if (filtros?.insumoId) {
    where.insumoId = filtros.insumoId;
  }

  const agrupado = await prisma.movimentacaoEstoqueInsumo.groupBy({
    by: ['tipo'],
    _sum: {
      quantidade: true,
      custoTotal: true,
    },
    where,
  });

  return agrupado.map(g => ({
    tipo: g.tipo as TipoMovimentacao,
    quantidadeTotal: Number(g._sum.quantidade || 0),
    custoTotal: Number(g._sum.custoTotal || 0),
  }));
}

export async function getResumoAlertasEstoque() {
  const insumos = await prisma.insumo.findMany({
    select: {
      quantidadeEstoque: true,
      estoqueMinimo: true,
    }
  });

  let totalInsumosZerados = 0;
  let totalInsumosAbaixoMinimo = 0;

  for (const insumo of insumos) {
    const qtd = Number(insumo.quantidadeEstoque);
    const min = Number(insumo.estoqueMinimo);
    
    if (qtd === 0) {
      totalInsumosZerados++;
    } else if (qtd > 0 && qtd < min) { // Garantindo que não considera zerado como abaixo do mínimo
      totalInsumosAbaixoMinimo++;
    }
  }

  return {
    totalInsumosZerados,
    totalInsumosAbaixoMinimo,
    totalCriticos: totalInsumosZerados + totalInsumosAbaixoMinimo
  };
}
