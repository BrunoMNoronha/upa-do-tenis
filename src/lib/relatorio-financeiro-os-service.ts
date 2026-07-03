import { prisma } from './prisma';
import { calcularResumoFinanceiroOS } from './ordens-servico-financeiro';

export interface RelatorioFiltros {
  inicio: string;
  fim: string;
  statusFinanceiro?: string;
  statusOperacional?: string;
  cliente?: string;
  saldoAberto?: boolean;
}

export interface RelatorioOSItem {
  id: string;
  numero: string;
  clienteNome: string;
  statusOperacional: string;
  statusFinanceiro: string;
  valorTotal: number;
  valorPago: number;
  saldo: number;
  dataEntrada: string;
  dataPrevisao: string;
  atrasada: boolean;
}

export interface RelatorioFinanceiroOSResponse {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    quantidadeOS: number;
    valorTotal: number;
    valorPago: number;
    saldoAberto: number;
    quantidadeComSaldoAberto: number;
  };
  itens: RelatorioOSItem[];
}

export async function gerarRelatorioFinanceiroOS(filtros: RelatorioFiltros): Promise<RelatorioFinanceiroOSResponse> {
  const inicioDate = new Date(filtros.inicio);
  const fimDate = new Date(filtros.fim);

  if (isNaN(inicioDate.getTime()) || isNaN(fimDate.getTime())) {
    throw new Error('Datas inválidas.');
  }

  if (inicioDate > fimDate) {
    throw new Error('A data inicial não pode ser maior que a data final.');
  }

  inicioDate.setHours(0, 0, 0, 0);
  fimDate.setHours(23, 59, 59, 999);

  const queryWhere: any = {
    dataEntrada: {
      gte: inicioDate,
      lte: fimDate,
    },
  };

  if (filtros.statusOperacional && filtros.statusOperacional !== 'TODOS') {
    queryWhere.status = filtros.statusOperacional;
  }

  if (filtros.cliente) {
    queryWhere.cliente = {
      nome: {
        contains: filtros.cliente,
      },
    };
  }

  const ordens = await prisma.ordemServico.findMany({
    where: queryWhere,
    include: {
      cliente: true,
      pagamentos: true,
      itens: {
        include: {
          servicos: {
            include: {
              servico: true
            }
          }
        }
      }
    },
    orderBy: {
      dataEntrada: 'desc',
    },
    take: 100, // Limite seguro
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let itens: RelatorioOSItem[] = ordens.map((ordem) => {
    const resumoFinanceiro = calcularResumoFinanceiroOS({
      statusOperacional: ordem.status,
      valorTotal: ordem.valorTotal,
      valorDesconto: ordem.valorDesconto,
      valorSinal: ordem.valorSinal,
      valorPago: ordem.valorPago,
      pagamentos: ordem.pagamentos,
      itens: ordem.itens,
    });

    const previsaoDate = new Date(ordem.dataPrevisao);
    previsaoDate.setHours(0, 0, 0, 0);
    const atrasada = ordem.status !== 'ENTREGUE' && ordem.status !== 'CONCLUIDA' && ordem.status !== 'CANCELADA' && previsaoDate < hoje;

    return {
      id: ordem.id,
      numero: ordem.numero,
      clienteNome: ordem.cliente.nome,
      statusOperacional: ordem.status,
      statusFinanceiro: resumoFinanceiro.statusFinanceiro,
      valorTotal: resumoFinanceiro.valorTotal,
      valorPago: resumoFinanceiro.valorPago,
      saldo: resumoFinanceiro.saldo,
      dataEntrada: ordem.dataEntrada.toISOString(),
      dataPrevisao: ordem.dataPrevisao.toISOString(),
      atrasada,
    };
  });

  // Filtros em memória (derivados)
  if (filtros.statusFinanceiro && filtros.statusFinanceiro !== 'TODOS') {
    itens = itens.filter(item => item.statusFinanceiro === filtros.statusFinanceiro);
  }

  if (filtros.saldoAberto === true) {
    itens = itens.filter(item => item.saldo > 0);
  } else if (filtros.saldoAberto === false) {
    itens = itens.filter(item => item.saldo === 0);
  }

  // Calcula resumo financeiro final apenas sobre os itens filtrados
  let quantidadeOS = 0;
  let valorTotalSum = 0;
  let valorPagoSum = 0;
  let saldoAbertoSum = 0;
  let quantidadeComSaldoAberto = 0;

  for (const item of itens) {
    quantidadeOS++;
    valorTotalSum += item.valorTotal;
    valorPagoSum += item.valorPago;
    saldoAbertoSum += item.saldo;
    if (item.saldo > 0) {
      quantidadeComSaldoAberto++;
    }
  }

  return {
    periodo: {
      inicio: filtros.inicio,
      fim: filtros.fim,
    },
    resumo: {
      quantidadeOS,
      valorTotal: valorTotalSum,
      valorPago: valorPagoSum,
      saldoAberto: saldoAbertoSum,
      quantidadeComSaldoAberto,
    },
    itens,
  };
}
