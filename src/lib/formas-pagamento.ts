import { prisma } from "@/lib/prisma";

/**
 * Listagem operacional: só formas ativas, para as telas de pagamento, venda
 * e caixa.
 */
export async function listarFormasPagamento() {
  return prisma.formaPagamento.findMany({
    where: { ativo: true },
    orderBy: {
      nome: "asc",
    },
  });
}

/**
 * Listagem de gestão: inclui as inativas e informa se a forma já possui
 * movimento financeiro (pagamento, venda ou movimentação de caixa). O flag
 * `possuiMovimento` trava a edição do `tipo` na tela, porque alterá-lo
 * reescreveria retroativamente o fechamento de caixa (ver src/lib/caixa.ts).
 */
export async function listarFormasPagamentoParaGestao() {
  const formas = await prisma.formaPagamento.findMany({
    orderBy: {
      nome: "asc",
    },
    include: {
      _count: {
        select: {
          pagamentos: true,
          vendas: true,
          movimentacoesCaixa: true,
        },
      },
    },
  });

  return formas.map(({ _count, ...forma }) => ({
    ...forma,
    possuiMovimento: _count.pagamentos + _count.vendas + _count.movimentacoesCaixa > 0,
  }));
}

/**
 * Saneamento seguro e idempotente: corrige apenas o caso inequívoco de a forma
 * de pagamento chamada exatamente "Dinheiro" (case-insensitive) estar com
 * `tipo` vazio/nulo — o que faz o caixa deixar de contar essas entradas como
 * dinheiro físico (achado crítico da Fatia 13.3, corrigido na Fatia 13.2.1).
 *
 * Não altera formas ambíguas (ex.: "Dinheiro Físico", "Espécie"): apenas o
 * nome exato "dinheiro" é corrigido automaticamente. Qualquer outro caso deve
 * ser revisado e corrigido manualmente pela tela de Formas de Pagamento.
 */
export async function sanearTipoFormaPagamentoDinheiro() {
  const candidatas = await prisma.formaPagamento.findMany({
    where: { nome: { equals: "Dinheiro", mode: "insensitive" } },
    select: { id: true, nome: true, tipo: true },
  });

  const corrigidas = candidatas.filter((forma) => !forma.tipo || forma.tipo.trim() === "");

  // Performance Optimization (Bolt):
  // Substitui o loop sequencial N+1 por uma única consulta `updateMany` em lote (batch).
  // Reduz as viagens de ida e volta (roundtrips) ao banco de dados de O(N) para O(1),
  // eliminando gargalos de I/O de rede e retenção de conexões no pool.
  if (corrigidas.length > 0) {
    await prisma.formaPagamento.updateMany({
      where: {
        id: { in: corrigidas.map((forma) => forma.id) },
      },
      data: { tipo: "DINHEIRO" },
    });
  }

  return {
    totalAnalisadas: candidatas.length,
    totalCorrigidas: corrigidas.length,
    idsCorrigidos: corrigidas.map((f) => f.id),
  };
}
