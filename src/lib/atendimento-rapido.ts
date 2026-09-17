import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { registrarMovimentacaoAutomaticaCaixa } from "@/lib/caixa";
import {
  calcularAtendimentoRapido,
  type CalculoAtendimentoRapido,
  type ItemAtendimentoEntrada,
  type PagamentoAtendimentoEntrada,
} from "@/lib/atendimento-rapido-calculo";
import {
  NAMESPACE_LOCK_ATENDIMENTO_RAPIDO,
  SequencialAtendimentoRapidoEsgotadoError,
  chaveLockDoDia,
  prefixoCodigoDoDia,
  proximoCodigoDoDia,
} from "@/lib/atendimento-rapido-codigo";
import type { RegistrarAtendimentoRapidoValues } from "@/lib/atendimento-rapido-schema";
import { centavosParaDecimal, formatarCentavos, paraCentavos } from "@/lib/centavos";
import { dataOperacional, intervaloDoDiaOperacional } from "@/lib/date-range";
import { montarCondicaoBusca } from "@/lib/busca-listagem";
import { normalizarDecimalParaNumero, normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";

export class AtendimentoRapidoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AtendimentoRapidoError";
    this.status = status;
  }
}

/** Mesma origem gravada em MovimentacaoCaixa.origem. */
export const ORIGEM_CAIXA_ATENDIMENTO_RAPIDO = "ATENDIMENTO_RAPIDO" as const;

const includeAtendimentoCompleto = {
  itens: { orderBy: [{ criadoEm: "asc" }, { id: "asc" }] },
  pagamentos: {
    include: { formaPagamento: { select: { id: true, nome: true } } },
    orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.AtendimentoRapidoInclude;

type AtendimentoCompleto = Prisma.AtendimentoRapidoGetPayload<{ include: typeof includeAtendimentoCompleto }>;

export type ResultadoRegistroAtendimentoRapido = {
  atendimento: AtendimentoCompleto;
  /** true quando a chave de idempotência já tinha gerado este atendimento (nada novo foi gravado). */
  reaproveitado: boolean;
};

const OPCOES_TRANSACAO = { maxWait: 5_000, timeout: 15_000 };

function decimalParaCentavos(valor: Prisma.Decimal): number | null {
  return paraCentavos(valor.toString());
}

/**
 * Uma chave de idempotência só pode devolver o atendimento que ela criou.
 * Reenviar a mesma chave com outro conteúdo é erro do cliente, não retry.
 */
function garantirMesmoConteudo(
  existente: AtendimentoCompleto,
  calculo: CalculoAtendimentoRapido,
  itens: readonly ItemAtendimentoEntrada[],
  pagamentos: readonly PagamentoAtendimentoEntrada[],
) {
  // Assinaturas independentes da ordem de gravação das linhas.
  const assinatura = (linhas: string[]) => [...linhas].sort().join("|");

  const itensIguais =
    assinatura(existente.itens.map((item) => `${item.servicoId}:${decimalParaCentavos(item.valor)}`)) ===
    assinatura(itens.map((item) => `${item.servicoId}:${item.valorCentavos}`));

  const pagamentosIguais =
    assinatura(
      existente.pagamentos.map(
        (pagamento) => `${pagamento.formaPagamentoId}:${decimalParaCentavos(pagamento.valor)}`,
      ),
    ) === assinatura(pagamentos.map((pagamento) => `${pagamento.formaPagamentoId}:${pagamento.valorCentavos}`));

  if (!itensIguais || !pagamentosIguais || decimalParaCentavos(existente.valorTotal) !== calculo.totalCentavos) {
    throw new AtendimentoRapidoError(
      "Esta chave de envio já foi usada para outro atendimento. Recarregue a tela e registre novamente.",
      409,
    );
  }
}

async function buscarPorChave(chaveIdempotencia: string) {
  return prisma.atendimentoRapido.findUnique({
    where: { chaveIdempotencia },
    include: includeAtendimentoCompleto,
  });
}

function ehConflitoUnico(error: unknown, campo: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const alvo = error.meta?.target;
  return Array.isArray(alvo) ? alvo.includes(campo) : String(alvo ?? "").includes(campo);
}

/**
 * Registra um Atendimento Rápido integralmente pago, em UMA transação:
 * atendimento + itens + pagamentos + entradas de caixa. Qualquer falha
 * desfaz tudo; nunca sobra atendimento sem pagamento, pagamento sem caixa ou
 * pagamento parcial.
 *
 * Reutiliza o fluxo financeiro da OS: cada pagamento é um `Pagamento`
 * (origem = atendimentoRapidoId) com a sua `MovimentacaoCaixa` criada por
 * `registrarMovimentacaoAutomaticaCaixa`, com as mesmas regras de caixa
 * aberto. Não toca OrdemServico nem Servico (o preço do catálogo não muda).
 *
 * Idempotência: `chaveIdempotencia` é UNIQUE. Repetir a chave devolve o
 * atendimento já criado (`reaproveitado: true`) sem gravar nada novo.
 */
export async function registrarAtendimentoRapido(
  payload: RegistrarAtendimentoRapidoValues,
  contexto: { usuarioId?: string | null } = {},
): Promise<ResultadoRegistroAtendimentoRapido> {
  const calculo = calcularAtendimentoRapido(payload.itens, payload.pagamentos);

  // Defesa em profundidade: o schema já exige, mas o serviço não confia no chamador.
  if (calculo.totalCentavos <= 0) {
    throw new AtendimentoRapidoError("O total do atendimento deve ser maior que zero.");
  }
  if (calculo.diferencaCentavos !== 0) {
    throw new AtendimentoRapidoError(
      `A soma dos pagamentos (${formatarCentavos(calculo.somaPagamentosCentavos)}) deve ser igual ao total do atendimento (${formatarCentavos(calculo.totalCentavos)}).`,
    );
  }

  // Retry/duplo clique já concluído: devolve o existente sem abrir transação.
  const existente = await buscarPorChave(payload.chaveIdempotencia);
  if (existente) {
    garantirMesmoConteudo(existente, calculo, payload.itens, payload.pagamentos);
    return { atendimento: normalizarValoresDecimalParaClient(existente), reaproveitado: true };
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Caixa aberto (mesma regra do pagamento de OS e da venda de balcão).
      const caixaAberto = await tx.caixa.findFirst({
        where: { status: "ABERTO" },
        select: { id: true },
      });
      if (!caixaAberto) {
        throw new AtendimentoRapidoError("Não há caixa aberto. Abra o caixa primeiro.", 400);
      }

      // 2. Formas de pagamento existem.
      const formaIds = [...new Set(payload.pagamentos.map((pagamento) => pagamento.formaPagamentoId))];
      const formas = await tx.formaPagamento.findMany({
        where: { id: { in: formaIds } },
        select: { id: true },
      });
      if (formas.length !== formaIds.length) {
        throw new AtendimentoRapidoError("Forma de pagamento inválida.", 400);
      }

      // 3. Serviços existem e estão ativos; o nome vira snapshot do item.
      const servicoIds = [...new Set(payload.itens.map((item) => item.servicoId))];
      const servicos = await tx.servico.findMany({
        where: { id: { in: servicoIds } },
        select: { id: true, nome: true, ativo: true },
      });
      const servicoPorId = new Map(servicos.map((servico) => [servico.id, servico]));
      for (const servicoId of servicoIds) {
        const servico = servicoPorId.get(servicoId);
        if (!servico) {
          throw new AtendimentoRapidoError("Serviço informado não encontrado.", 400);
        }
        if (!servico.ativo) {
          throw new AtendimentoRapidoError(`O serviço "${servico.nome}" está inativo e não pode ser usado.`, 400);
        }
      }

      // 4. Lock transacional do dia operacional: serializa a geração do
      //    código entre transações concorrentes. Liberado no commit/rollback.
      const agora = new Date();
      const dia = dataOperacional(agora);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${NAMESPACE_LOCK_ATENDIMENTO_RAPIDO}::integer, ${chaveLockDoDia(dia)}::integer)`;

      // 5. Com o lock, uma requisição concorrente com a mesma chave que já
      //    tenha concluído fica visível: devolve-a em vez de duplicar.
      const concluidoEnquantoAguardava = await tx.atendimentoRapido.findUnique({
        where: { chaveIdempotencia: payload.chaveIdempotencia },
        include: includeAtendimentoCompleto,
      });
      if (concluidoEnquantoAguardava) {
        return { atendimento: concluidoEnquantoAguardava, reaproveitado: true };
      }

      // 6. Próximo código do dia (maior código do dia + 1, sob o lock).
      const maiorDoDia = await tx.atendimentoRapido.findFirst({
        where: { codigo: { startsWith: prefixoCodigoDoDia(dia) } },
        orderBy: { codigo: "desc" },
        select: { codigo: true },
      });
      const codigo = proximoCodigoDoDia(dia, maiorDoDia?.codigo ?? null);

      // 7. Atendimento + itens (preço do atendimento como snapshot).
      const atendimento = await tx.atendimentoRapido.create({
        data: {
          codigo,
          dataHora: agora,
          valorTotal: centavosParaDecimal(calculo.totalCentavos),
          observacoes: payload.observacoes,
          chaveIdempotencia: payload.chaveIdempotencia,
          criadoPorId: contexto.usuarioId ?? null,
          itens: {
            create: payload.itens.map((item) => ({
              servicoId: item.servicoId,
              descricao: servicoPorId.get(item.servicoId)!.nome,
              valor: centavosParaDecimal(item.valorCentavos),
            })),
          },
        },
        select: { id: true },
      });

      // 8. Um Pagamento e uma entrada de caixa por forma de pagamento.
      for (const pagamentoEntrada of payload.pagamentos) {
        const valor = centavosParaDecimal(pagamentoEntrada.valorCentavos);

        const pagamento = await tx.pagamento.create({
          data: {
            atendimentoRapidoId: atendimento.id,
            formaPagamentoId: pagamentoEntrada.formaPagamentoId,
            tipo: "PAGAMENTO",
            valor,
            dataPagamento: agora,
          },
          select: { id: true },
        });

        await registrarMovimentacaoAutomaticaCaixa(
          {
            caixaId: caixaAberto.id,
            tipo: "ENTRADA",
            origem: ORIGEM_CAIXA_ATENDIMENTO_RAPIDO,
            valor,
            descricao: `Atendimento rápido ${codigo}`,
            formaPagamentoId: pagamentoEntrada.formaPagamentoId,
            pagamentoId: pagamento.id,
            atendimentoRapidoId: atendimento.id,
          },
          tx,
        );
      }

      const completo = await tx.atendimentoRapido.findUniqueOrThrow({
        where: { id: atendimento.id },
        include: includeAtendimentoCompleto,
      });

      return { atendimento: completo, reaproveitado: false };
    }, OPCOES_TRANSACAO);

    if (resultado.reaproveitado) {
      garantirMesmoConteudo(resultado.atendimento, calculo, payload.itens, payload.pagamentos);
    }

    return { ...resultado, atendimento: normalizarValoresDecimalParaClient(resultado.atendimento) };
  } catch (error) {
    // Última barreira da idempotência: corrida que só o UNIQUE detectou.
    if (ehConflitoUnico(error, "chaveIdempotencia")) {
      const criado = await buscarPorChave(payload.chaveIdempotencia);
      if (criado) {
        garantirMesmoConteudo(criado, calculo, payload.itens, payload.pagamentos);
        return { atendimento: normalizarValoresDecimalParaClient(criado), reaproveitado: true };
      }
    }

    // Última barreira da unicidade do código (não deveria ocorrer com o lock).
    if (ehConflitoUnico(error, "codigo")) {
      throw new AtendimentoRapidoError("Conflito ao gerar o código do atendimento. Tente novamente.", 409);
    }

    if (error instanceof SequencialAtendimentoRapidoEsgotadoError) {
      throw new AtendimentoRapidoError(error.message, 409);
    }

    throw error;
  }
}

export type FiltrosListagemAtendimentosRapidos = {
  busca?: string;
  dataInicial?: string;
  dataFinal?: string;
};

function montarWhereAtendimentosRapidos(filtros?: FiltrosListagemAtendimentosRapidos) {
  const where: Prisma.AtendimentoRapidoWhereInput = {};

  const busca = montarCondicaoBusca(filtros?.busca, ["codigo"]);
  if (busca) {
    Object.assign(where, busca);
  }

  if (filtros?.dataInicial || filtros?.dataFinal) {
    const dataHora: Prisma.DateTimeFilter = {};

    if (filtros.dataInicial) {
      const { inicio } = intervaloDoDiaOperacional(filtros.dataInicial);
      if (Number.isNaN(inicio.getTime())) {
        throw new AtendimentoRapidoError("Data inicial inválida.", 400);
      }
      dataHora.gte = inicio;
    }

    if (filtros.dataFinal) {
      const { inicio, fimExclusivo } = intervaloDoDiaOperacional(filtros.dataFinal);
      if (Number.isNaN(inicio.getTime())) {
        throw new AtendimentoRapidoError("Data final inválida.", 400);
      }
      if (dataHora.gte && dataHora.gte > inicio) {
        throw new AtendimentoRapidoError("A data final não pode ser menor que a data inicial.", 400);
      }
      dataHora.lt = fimExclusivo;
    }

    where.dataHora = dataHora;
  }

  return where;
}

/** Linha da consulta, já serializável para o navegador (valores só para exibição). */
export type AtendimentoRapidoListagem = {
  id: string;
  codigo: string;
  dataHora: string;
  valorTotal: number;
  observacoes: string | null;
  itens: { id: string; descricao: string; valor: number }[];
  pagamentos: { id: string; valor: number; formaPagamento: { nome: string } }[];
};

function montarAtendimentoListagem(atendimento: AtendimentoCompleto): AtendimentoRapidoListagem {
  return {
    id: atendimento.id,
    codigo: atendimento.codigo,
    dataHora: atendimento.dataHora.toISOString(),
    valorTotal: normalizarDecimalParaNumero(atendimento.valorTotal),
    observacoes: atendimento.observacoes,
    itens: atendimento.itens.map((item) => ({
      id: item.id,
      descricao: item.descricao,
      valor: normalizarDecimalParaNumero(item.valor),
    })),
    pagamentos: atendimento.pagamentos.map((pagamento) => ({
      id: pagamento.id,
      valor: normalizarDecimalParaNumero(pagamento.valor),
      formaPagamento: { nome: pagamento.formaPagamento.nome },
    })),
  };
}

/** Consulta paginada server-side (tela e API). Somente leitura. */
export async function listarAtendimentosRapidosPaginado(params: {
  filtros?: FiltrosListagemAtendimentosRapidos;
  paginacao: PaginacaoNormalizada;
}) {
  const where = montarWhereAtendimentosRapidos(params.filtros);

  const resultado = await paginarConsulta({
    paginacao: params.paginacao,
    contar: () => prisma.atendimentoRapido.count({ where }),
    buscar: ({ skip, take }) =>
      prisma.atendimentoRapido.findMany({
        where,
        orderBy: [{ dataHora: "desc" }, { id: "desc" }],
        include: includeAtendimentoCompleto,
        skip,
        take,
      }),
  });

  return {
    data: resultado.data.map(montarAtendimentoListagem),
    pagination: resultado.pagination,
  };
}
