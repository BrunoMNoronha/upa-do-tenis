import { prisma } from "@/lib/prisma";

export async function listarFormasPagamento() {
  return prisma.formaPagamento.findMany({
    where: { ativo: true },
    orderBy: {
      nome: "asc",
    },
  });
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

  for (const forma of corrigidas) {
    await prisma.formaPagamento.update({
      where: { id: forma.id },
      data: { tipo: "DINHEIRO" },
    });
  }

  return {
    totalAnalisadas: candidatas.length,
    totalCorrigidas: corrigidas.length,
    idsCorrigidos: corrigidas.map((f) => f.id),
  };
}
