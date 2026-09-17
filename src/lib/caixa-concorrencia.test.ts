import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  fecharCaixa,
  registrarMovimentacaoAutomaticaCaixa,
  registrarMovimentacaoCaixa,
  travarCaixa,
} from "@/lib/caixa";
import { prisma } from "@/lib/prisma";

// Corrida entre fechar o caixa e lançar movimentação (P1 da revisão do #239),
// contra o banco real de testes. Cada cenário segura uma transação aberta e
// prova que a outra operação espera por ela em vez de passar por cima.

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];
const ESPERA_MS = 400;

let caixaId: string;
let dinheiroId: string;

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolve com "pendente" se a promessa ainda não terminou depois de `ms`. */
async function aindaPendente(promessa: Promise<unknown>, ms = ESPERA_MS) {
  const marcador = Symbol("pendente");
  const resultado = await Promise.race([promessa.then(() => null, () => null), esperar(ms).then(() => marcador)]);
  return resultado === marcador;
}

/** Abre uma transação, executa `dentro` e só confirma quando `liberar` for chamado. */
function transacaoSegurada(dentro: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<unknown>) {
  let liberar!: () => void;
  const liberada = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  let pronta!: () => void;
  const executou = new Promise<void>((resolve) => {
    pronta = resolve;
  });

  const concluida = prisma.$transaction(
    async (tx) => {
      await dentro(tx);
      pronta();
      await liberada;
    },
    { maxWait: 5_000, timeout: 15_000 },
  );

  return { executou, liberar, concluida };
}

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Este teste requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  await prisma.caixa.updateMany({ where: { status: "ABERTO" }, data: { status: "FECHADO" } });
  caixaId = (await prisma.caixa.create({ data: { saldoInicial: 100, status: "ABERTO" } })).id;
  dinheiroId = (await prisma.formaPagamento.create({ data: { nome: `Dinheiro trava ${randomUUID()}`, tipo: "DINHEIRO" } })).id;
});

afterEach(async () => {
  await prisma.movimentacaoCaixa.deleteMany({ where: { caixaId } });
  await prisma.caixa.deleteMany({ where: { id: caixaId } });
  await prisma.formaPagamento.deleteMany({ where: { id: dinheiroId } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("trava do caixa entre fechamento e lançamentos", () => {
  it("lançamento automático em andamento: o fechamento espera e inclui a saída no saldo calculado", async () => {
    const lancamento = transacaoSegurada((tx) =>
      registrarMovimentacaoAutomaticaCaixa(
        {
          caixaId,
          tipo: "SAIDA",
          origem: "ESTORNO_ATENDIMENTO_RAPIDO",
          valor: "40",
          descricao: "Estorno concorrente",
          formaPagamentoId: dinheiroId,
        },
        tx,
      ),
    );
    await lancamento.executou;

    const fechamento = fecharCaixa(caixaId, { saldoFinalInformado: 60 });
    expect(await aindaPendente(fechamento)).toBe(true);

    lancamento.liberar();
    await lancamento.concluida;
    const fechado = await fechamento;

    expect(Number(fechado.saldoFinalCalculado)).toBe(60);
    expect(Number(fechado.divergencia)).toBe(0);
  });

  it("lançamento manual em andamento: o fechamento espera e inclui a entrada", async () => {
    const lancamento = transacaoSegurada((tx) =>
      registrarMovimentacaoCaixa(
        caixaId,
        { tipo: "REFORCO", valor: 25, descricao: "Reforço concorrente", formaPagamentoId: dinheiroId },
        tx,
      ),
    );
    await lancamento.executou;

    const fechamento = fecharCaixa(caixaId, { saldoFinalInformado: 125 });
    expect(await aindaPendente(fechamento)).toBe(true);

    lancamento.liberar();
    await lancamento.concluida;
    const fechado = await fechamento;

    expect(Number(fechado.saldoFinalCalculado)).toBe(125);
    expect(Number(fechado.divergencia)).toBe(0);
  });

  it("fechamento em andamento: o lançamento automático espera, encontra o caixa fechado e não grava nada", async () => {
    const fechamento = transacaoSegurada(async (tx) => {
      await travarCaixa(tx, caixaId);
      await tx.caixa.update({ where: { id: caixaId }, data: { status: "FECHADO", saldoFinalCalculado: 100 } });
    });
    await fechamento.executou;

    const lancamento = prisma.$transaction((tx) =>
      registrarMovimentacaoAutomaticaCaixa(
        { caixaId, tipo: "SAIDA", origem: "ESTORNO_PAGAMENTO_OS", valor: "40", descricao: "Tarde demais", formaPagamentoId: dinheiroId },
        tx,
      ),
    );
    const resultado = lancamento.then(
      () => null,
      (error: unknown) => error,
    );
    expect(await aindaPendente(resultado)).toBe(true);

    fechamento.liberar();
    await fechamento.concluida;

    expect(await resultado).toMatchObject({ status: 400, message: "Não é possível movimentar um caixa fechado." });
    expect(await prisma.movimentacaoCaixa.count({ where: { caixaId } })).toBe(0);
  });

  it("fechamento em andamento: o lançamento manual sem transação externa também espera e é recusado", async () => {
    const fechamento = transacaoSegurada(async (tx) => {
      await travarCaixa(tx, caixaId);
      await tx.caixa.update({ where: { id: caixaId }, data: { status: "FECHADO", saldoFinalCalculado: 100 } });
    });
    await fechamento.executou;

    const resultado = registrarMovimentacaoCaixa(caixaId, {
      tipo: "SANGRIA",
      valor: 10,
      descricao: "Sangria tardia",
      formaPagamentoId: dinheiroId,
    }).then(
      () => null,
      (error: unknown) => error,
    );
    expect(await aindaPendente(resultado)).toBe(true);

    fechamento.liberar();
    await fechamento.concluida;

    expect(await resultado).toMatchObject({ status: 400 });
    expect(await prisma.movimentacaoCaixa.count({ where: { caixaId } })).toBe(0);
  });

  it("caixa inexistente continua devolvendo 404", async () => {
    await expect(
      prisma.$transaction((tx) =>
        registrarMovimentacaoAutomaticaCaixa(
          { caixaId: "nao-existe", tipo: "ENTRADA", origem: "PAGAMENTO_OS", valor: 10, descricao: "x" },
          tx,
        ),
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});
