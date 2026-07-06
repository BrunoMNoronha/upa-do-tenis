/**
 * Saneamento crítico — Fatia 13.2.1.
 *
 * Corrige a forma de pagamento "Dinheiro" (nome exato, case-insensitive)
 * quando cadastrada com `tipo` vazio/nulo, preenchendo `tipo = "DINHEIRO"`.
 * Sem essa correção, o caixa não contabiliza essas entradas no saldo físico
 * (achado crítico encontrado na verificação manual da Fatia 13.3).
 *
 * Não altera nenhuma outra forma de pagamento. Idempotente: rodar novamente
 * não tem efeito colateral se já estiver corrigido.
 *
 * Uso:
 *   npm run saneamento:forma-dinheiro
 */
import { prisma } from "../src/lib/prisma";
import { sanearTipoFormaPagamentoDinheiro } from "../src/lib/formas-pagamento";

async function main() {
  console.log("Saneamento de FormaPagamento 'Dinheiro' — UPA do Tênis");

  const resultado = await sanearTipoFormaPagamentoDinheiro();

  console.log(`Formas chamadas "Dinheiro" encontradas: ${resultado.totalAnalisadas}`);

  if (resultado.totalCorrigidas === 0) {
    console.log("✅ Nenhuma correção necessária — tipo já preenchido corretamente.");
    return;
  }

  console.log(`✅ Corrigidas ${resultado.totalCorrigidas} forma(s) para tipo = "DINHEIRO":`);
  for (const id of resultado.idsCorrigidos) {
    console.log(`  - ${id}`);
  }
}

main()
  .catch((erro) => {
    console.error("Erro ao executar saneamento:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
