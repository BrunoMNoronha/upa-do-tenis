import { prisma } from "@/lib/prisma";
import {
  INCLUDE_ESTORNO_PAGAMENTO,
  calcularResumoFinanceiroOS,
  normalizarValoresDecimalParaClient,
} from "@/lib/ordens-servico-financeiro";
import {
  montarWhereListagemOrdensServico,
  type FiltrosListagemOrdensServico,
} from "@/lib/ordens-servico-listagem";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";
import { montarCaminhoAcompanhamento } from "@/lib/os-acompanhamento-token";

export {
  transicoesPermitidas,
  transicaoPermitida,
  podeCancelarOrdemServico,
} from "@/lib/ordens-servico-status";
export type { OsStatus } from "@/lib/ordens-servico-status";

export class OrdemServicoDetalheError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OrdemServicoDetalheError";
    this.status = status;
  }
}

const includeListagemOrdemServico = {
  cliente: true,
  pagamentos: { include: INCLUDE_ESTORNO_PAGAMENTO },
  itens: {
    include: {
      servicos: {
        include: {
          servico: true,
        },
      },
    },
  },
  historicosStatus: {
    orderBy: {
      criadoEm: "desc" as const,
    },
  },
};

// Favoritas primeiro (marcador operacional, issue #153). Dentro de cada
// grupo vale a ordem operacional: dataEntrada pode ser retroativa; criadoEm
// desempata registros do mesmo dia mantendo o mais recente primeiro.
const orderByListagemOrdemServico = [
  { favorita: "desc" as const },
  { dataEntrada: "desc" as const },
  { criadoEm: "desc" as const },
];

// A paginação exige ordem total: `id` fecha o desempate para que um registro
// nunca apareça em duas páginas ou suma entre elas.
const orderByListagemOrdemServicoPaginada = [
  ...orderByListagemOrdemServico,
  { id: "desc" as const },
];

type OrdemServicoListagemBruta = {
  status: string;
  valorTotal: unknown;
  valorDesconto: unknown;
  valorSinal: unknown;
  valorPago: unknown;
  pagamentos: Parameters<typeof calcularResumoFinanceiroOS>[0]["pagamentos"];
  itens: Parameters<typeof calcularResumoFinanceiroOS>[0]["itens"] &
    Array<{ fotoRecebimentoPathname?: string | null }>;
};

function omitirCaminhoFotoRecebimento<T extends { fotoRecebimentoPathname?: string | null }>(item: T) {
  const { fotoRecebimentoPathname: _caminhoPrivado, ...itemPublico } = item;
  return itemPublico;
}

function montarOrdemServicoListagem<T extends OrdemServicoListagemBruta>(ordem: T) {
  const normalizada = normalizarValoresDecimalParaClient(ordem);
  const resumoFinanceiro = calcularResumoFinanceiroOS({
    statusOperacional: ordem.status,
    valorTotal: ordem.valorTotal as Parameters<typeof calcularResumoFinanceiroOS>[0]["valorTotal"],
    valorDesconto: ordem.valorDesconto as Parameters<typeof calcularResumoFinanceiroOS>[0]["valorDesconto"],
    valorSinal: ordem.valorSinal as Parameters<typeof calcularResumoFinanceiroOS>[0]["valorSinal"],
    valorPago: ordem.valorPago as Parameters<typeof calcularResumoFinanceiroOS>[0]["valorPago"],
    pagamentos: ordem.pagamentos,
    itens: ordem.itens,
  });

  return {
    ...normalizada,
    ...resumoFinanceiro,
    itens: normalizada.itens.map(omitirCaminhoFotoRecebimento),
  };
}

export type EstatisticasOrdensServico = {
  abertas: number;
  emAndamento: number;
  comSaldo: number;
  atrasadas: number;
};

/** Clientes ativos do cadastro de OS; a leitura permanece sempre atual. */
export async function listarClientesCadastroOS() {
  return prisma.cliente.findMany({
    where: { ativo: true },
    orderBy: [{ criadoEm: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true, telefone: true },
  });
}

/** Opções leves, consultadas somente quando o cadastro de OS é aberto. */
export async function listarOpcoesCadastroOS() {
  const [clientes, servicos] = await Promise.all([
    listarClientesCadastroOS(),
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, precoBase: true },
    }),
  ]);
  return {
    clientes,
    servicos: servicos.map((servico) => ({
      id: servico.id,
      nome: servico.nome,
      precoBase: servico.precoBase.toString(),
    })),
  };
}

/**
 * Contadores exibidos no topo da listagem. São calculados sobre TODAS as OS
 * (não apenas a página atual nem o filtro ativo), preservando o comportamento
 * anterior em que os cards refletiam o conjunto completo.
 */
export async function contarEstatisticasOrdensServico(
  agora: Date = new Date(),
): Promise<EstatisticasOrdensServico> {
  // Reusa o mesmo `where` do filtro "Atrasadas" para que o alerta e a
  // listagem filtrada nunca divirjam.
  const whereAtrasadas = montarWhereListagemOrdensServico(
    { atrasadas: true },
    { agora, referencias: { valorTotal: prisma.ordemServico.fields.valorTotal } },
  );

  const [abertas, emAndamento, comSaldo, atrasadas] = await Promise.all([
    prisma.ordemServico.count({ where: { status: "ABERTA" } }),
    prisma.ordemServico.count({ where: { status: "EM_ANDAMENTO" } }),
    prisma.ordemServico.count({ where: { saldo: { gt: 0 } } }),
    prisma.ordemServico.count({ where: whereAtrasadas }),
  ]);

  return { abertas, emAndamento, comSaldo, atrasadas };
}

/**
 * Listagem paginada server-side. `count` e `findMany` compartilham o mesmo
 * `where`; a ordenação é a vigente (favoritas primeiro) com `id` como
 * desempate determinístico.
 */
export async function listarOrdensServicoPaginado(params: {
  filtros: FiltrosListagemOrdensServico;
  paginacao: PaginacaoNormalizada;
  agora?: Date;
}) {
  const where = montarWhereListagemOrdensServico(params.filtros, {
    agora: params.agora ?? new Date(),
    referencias: { valorTotal: prisma.ordemServico.fields.valorTotal },
  });

  const resultado = await paginarConsulta({
    paginacao: params.paginacao,
    contar: () => prisma.ordemServico.count({ where }),
    buscar: ({ skip, take }) =>
      prisma.ordemServico.findMany({
        where,
        include: includeListagemOrdemServico,
        orderBy: orderByListagemOrdemServicoPaginada,
        skip,
        take,
      }),
  });

  return {
    data: resultado.data.map((ordem) => montarOrdemServicoListagem(ordem)),
    pagination: resultado.pagination,
  };
}

export type ResultadoListagemOrdensServico = Awaited<ReturnType<typeof listarOrdensServicoPaginado>>;

/** Leitura da página: mantém os insumos do cálculo financeiro apenas no servidor. */
export async function listarOrdensServicoResumoPaginado(params: {
  filtros: FiltrosListagemOrdensServico;
  paginacao: PaginacaoNormalizada;
  agora?: Date;
}) {
  const where = montarWhereListagemOrdensServico(params.filtros, {
    agora: params.agora ?? new Date(),
    referencias: { valorTotal: prisma.ordemServico.fields.valorTotal },
  });
  const resultado = await paginarConsulta({
    paginacao: params.paginacao,
    contar: () => prisma.ordemServico.count({ where }),
    buscar: ({ skip, take }) => prisma.ordemServico.findMany({
      where,
      orderBy: orderByListagemOrdemServicoPaginada,
      skip,
      take,
      select: {
        id: true, numero: true, status: true, favorita: true,
        dataPrevisao: true, observacoes: true,
        valorTotal: true, valorDesconto: true, valorSinal: true, valorPago: true,
        cliente: { select: { nome: true, telefone: true } },
        pagamentos: { select: { valor: true, estorno: { select: { id: true } } } },
        itens: { select: {
          descricao: true, valor: true,
          servicos: { select: {
            valor: true,
            servico: { select: { nome: true, precoBase: true } },
          } },
        } },
        historicosStatus: {
          select: { id: true, statusAnterior: true, statusNovo: true, observacao: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
        },
      },
    }),
  });

  return {
    data: resultado.data.map((ordem) => {
      const financeiro = calcularResumoFinanceiroOS({
        statusOperacional: ordem.status,
        valorTotal: ordem.valorTotal,
        valorDesconto: ordem.valorDesconto,
        valorSinal: ordem.valorSinal,
        valorPago: ordem.valorPago,
        pagamentos: ordem.pagamentos,
        itens: ordem.itens,
      });
      return {
        id: ordem.id,
        numero: ordem.numero,
        status: ordem.status,
        favorita: ordem.favorita,
        dataPrevisao: ordem.dataPrevisao.toISOString(),
        observacoes: ordem.observacoes,
        cliente: ordem.cliente,
        itens: ordem.itens.map((item) => ({
          descricao: item.descricao,
          servicos: item.servicos.map((vinculo) => ({ servico: { nome: vinculo.servico.nome } })),
        })),
        historicosStatus: ordem.historicosStatus.map((historico) => ({
          ...historico,
          criadoEm: historico.criadoEm.toISOString(),
        })),
        valorTotal: financeiro.valorTotal,
        valorPago: financeiro.valorPago,
        saldo: financeiro.saldo,
        statusFinanceiro: financeiro.statusFinanceiro,
      };
    }),
    pagination: resultado.pagination,
  };
}

export type OrdemServicoResumo = Awaited<ReturnType<typeof listarOrdensServicoResumoPaginado>>["data"][number];

export async function listarOrdensServico() {
  const ordens = await prisma.ordemServico.findMany({
    include: includeListagemOrdemServico,
    orderBy: orderByListagemOrdemServico,
  });

  return ordens.map((ordem) => montarOrdemServicoListagem(ordem));
}

/**
 * Marca ou desmarca uma OS como favorita. Operação idempotente: quando o
 * estado persistido já é o solicitado, nada é gravado. Só o campo
 * `favorita` é escrito; status, datas, valores e vínculos ficam intactos.
 */
export async function definirFavoritaOrdemServico(id: string, favorita: boolean) {
  const atual = await prisma.ordemServico.findUnique({
    where: { id },
    select: { id: true, numero: true, favorita: true },
  });

  if (!atual) {
    throw new OrdemServicoDetalheError("Ordem de serviço não encontrada.", 404);
  }

  if (atual.favorita === favorita) {
    return atual;
  }

  return prisma.ordemServico.update({
    where: { id },
    data: { favorita },
    select: { id: true, numero: true, favorita: true },
  });
}

export async function obterDetalheOrdemServico(id: string) {
  const ordem = await prisma.ordemServico.findUnique({
    where: { id },
    include: {
      cliente: true,
      itens: {
        include: {
          fotos: {
            select: { id: true, criadoEm: true },
            orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
          },
          servicos: {
            include: {
              servico: true,
            },
          },
          insumos: {
            include: {
              insumo: true,
            },
            orderBy: {
              criadoEm: "desc",
            },
          },
        },
      },
      pagamentos: {
        include: {
          formaPagamento: true,
          // Superconjunto de INCLUDE_ESTORNO_PAGAMENTO: o detalhe exibe o estorno (#230).
          estorno: {
            select: {
              id: true,
              valor: true,
              motivo: true,
              dataEstorno: true,
              usuario: { select: { id: true, nome: true } },
            },
          },
        },
        orderBy: [{ dataPagamento: "desc" }, { criadoEm: "desc" }],
      },
      historicosStatus: {
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
  });

  if (!ordem) {
    throw new OrdemServicoDetalheError("Ordem de serviço não encontrada.", 404);
  }

  const resumoFinanceiro = calcularResumoFinanceiroOS({
    statusOperacional: ordem.status,
    valorTotal: ordem.valorTotal,
    valorDesconto: ordem.valorDesconto,
    valorSinal: ordem.valorSinal,
    valorPago: ordem.valorPago,
    pagamentos: ordem.pagamentos,
    itens: ordem.itens,
  });

  const ordemNormalizada = normalizarValoresDecimalParaClient(ordem);

  return {
    ...ordemNormalizada,
    itens: ordemNormalizada.itens.map((item) => {
      const fotos = (item.fotos ?? []).map((foto) => ({
        id: foto.id,
        criadoEm: foto.criadoEm,
      }));
      return {
        ...omitirCaminhoFotoRecebimento(item),
        fotos,
        possuiFotoRecebimento: fotos.length > 0 || Boolean(item.fotoRecebimentoPathname),
      };
    }),
    resumoFinanceiro,
  };
}

/** Mesmo contrato entregue pelo GET de detalhe, compartilhado com a página RSC. */
export async function obterDetalheOrdemServicoDto(id: string) {
  const ordem = await obterDetalheOrdemServico(id);
  return {
    ...ordem,
    caminhoAcompanhamento: montarCaminhoAcompanhamento(ordem.id),
  };
}
