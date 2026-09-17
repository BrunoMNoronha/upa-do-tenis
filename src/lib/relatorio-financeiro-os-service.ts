import { prisma } from './prisma';
import { INCLUDE_ESTORNO_PAGAMENTO, calcularResumoFinanceiroOS } from './ordens-servico-financeiro';
import { dataOperacional, intervaloDoDiaOperacional } from './date-range';
import {
  calcularAgregadosRelatorio,
  calcularResumoRelatorio,
  RelatorioFinanceiroOSAgregados,
  RelatorioFinanceiroOSResumo,
} from './relatorio-financeiro-os-agregacoes';

/**
 * Limite de linhas devolvidas para a tabela. Resumo e gráficos NÃO são
 * afetados por este limite: eles representam todo o conjunto filtrado.
 */
export const LIMITE_ITENS_TABELA = 100;

/**
 * Teto de segurança para o universo agregado (proteção contra consulta
 * ilimitada). Se atingido, a resposta sinaliza `agregacaoTruncada = true`
 * e a UI deve avisar que os números podem estar incompletos.
 */
export const LIMITE_UNIVERSO_AGREGACAO = 5000;

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
  /** Resumo de TODO o conjunto filtrado (não limitado pela tabela). */
  resumo: RelatorioFinanceiroOSResumo;
  /** Agregados para gráficos, calculados sobre o mesmo conjunto do resumo. */
  agregados: RelatorioFinanceiroOSAgregados;
  /** Itens da tabela: primeiras `limite` OS (ordenadas por dataEntrada desc). */
  itens: RelatorioOSItem[];
  tabela: {
    limite: number;
    totalItens: number;
    limitada: boolean;
  };
  /** true quando o universo filtrado ultrapassou LIMITE_UNIVERSO_AGREGACAO. */
  agregacaoTruncada: boolean;
}

export async function gerarRelatorioFinanceiroOS(filtros: RelatorioFiltros): Promise<RelatorioFinanceiroOSResponse> {
  // Dias completos no fuso da operação, independente do fuso do processo.
  const { inicio: inicioDate } = intervaloDoDiaOperacional(filtros.inicio);
  const { inicio: inicioDoDiaFinal, fimExclusivo } = intervaloDoDiaOperacional(filtros.fim);

  if (isNaN(inicioDate.getTime()) || isNaN(inicioDoDiaFinal.getTime())) {
    throw new Error('Datas inválidas.');
  }

  if (inicioDate > inicioDoDiaFinal) {
    throw new Error('A data inicial não pode ser maior que a data final.');
  }

  const queryWhere: any = {
    dataEntrada: {
      gte: inicioDate,
      lt: fimExclusivo,
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
      pagamentos: { include: INCLUDE_ESTORNO_PAGAMENTO },
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
    // Teto de segurança do universo agregado. A limitação da tabela é
    // aplicada DEPOIS dos filtros derivados (status financeiro / saldo),
    // para que resumo e gráficos representem o conjunto filtrado completo.
    take: LIMITE_UNIVERSO_AGREGACAO + 1,
  });

  const agregacaoTruncada = ordens.length > LIMITE_UNIVERSO_AGREGACAO;
  if (agregacaoTruncada) {
    ordens.length = LIMITE_UNIVERSO_AGREGACAO;
  }

  // "YYYY-MM-DD" no fuso da operação; compara corretamente como texto.
  const hoje = dataOperacional(new Date());

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

    const previsaoDia = dataOperacional(new Date(ordem.dataPrevisao));
    const atrasada = ordem.status !== 'ENTREGUE' && ordem.status !== 'CONCLUIDA' && ordem.status !== 'CANCELADA' && previsaoDia < hoje;

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

  // Resumo e agregados sobre TODOS os itens filtrados; tabela limitada à parte.
  const resumo = calcularResumoRelatorio(itens);
  const agregados = calcularAgregadosRelatorio(itens);
  const totalItens = itens.length;
  const itensTabela = itens.slice(0, LIMITE_ITENS_TABELA);

  return {
    periodo: {
      inicio: filtros.inicio,
      fim: filtros.fim,
    },
    resumo,
    agregados,
    itens: itensTabela,
    tabela: {
      limite: LIMITE_ITENS_TABELA,
      totalItens,
      limitada: totalItens > LIMITE_ITENS_TABELA,
    },
    agregacaoTruncada,
  };
}
