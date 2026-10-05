/** Fixtures exclusivamente locais da issue #271; nunca usar em produção. */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/passwords";

const destino = new URL(process.env.DATABASE_URL ?? "");
if (destino.hostname !== "localhost" || destino.port !== "55440" || destino.pathname !== "/upa_do_tenis_issue271") {
  throw new Error("Fixture permitida somente em localhost:55440/upa_do_tenis_issue271.");
}

const acao = process.argv[2];
if (!["pendente", "hoje", "antigo", "sem-caixa", "estado"].includes(acao)) {
  throw new Error("Use pendente, hoje, antigo, sem-caixa ou estado.");
}

async function main() {
  const prisma = new PrismaClient();
  try {
    if (acao !== "estado") {
      await prisma.usuario.upsert({
        where: { email: "caixa271@example.test" },
        create: { nome: "Operador de teste 271", email: "caixa271@example.test", senhaHash: hashPassword("Caixa271-local!"), ativo: true },
        update: { ativo: true },
      });
      await prisma.formaPagamento.upsert({
        where: { id: "dinheiro-271" },
        create: { id: "dinheiro-271", nome: "Dinheiro", tipo: "DINHEIRO", ativo: true },
        update: {},
      });
      // Reseta apenas esta base descartável, preservando histórico das execuções.
      await prisma.caixa.updateMany({ where: { status: "ABERTO" }, data: { status: "FECHADO", dataFechamento: new Date() } });
      if (acao !== "sem-caixa") {
        const dias = acao === "pendente" ? 1 : acao === "antigo" ? 4 : 0;
        const dataAbertura = new Date(Date.now() - dias * 86_400_000);
        const caixa = await prisma.caixa.create({ data: { saldoInicial: 100, dataAbertura, observacao: "Fixture issue 271" } });
        await prisma.movimentacaoCaixa.create({ data: {
          caixaId: caixa.id, tipo: "ENTRADA", origem: "MANUAL", valor: 20,
          descricao: "Entrada sintética", formaPagamentoId: "dinheiro-271",
        } });
      }
    }
    console.log(JSON.stringify(await prisma.caixa.findMany({
      orderBy: { dataAbertura: "desc" },
      select: { id: true, status: true, dataAbertura: true, saldoInicial: true, saldoFinalInformado: true, saldoFinalCalculado: true, divergencia: true },
    }), null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => { console.error(erro); process.exitCode = 1; });
