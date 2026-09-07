import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

import { RateLimitStorePrisma } from "./rate-limit-prisma";
import {
  PoliticaRateLimit,
  registrarFalha,
  registrarSucesso,
  verificarBloqueio,
} from "./rate-limit";

const prisma = new PrismaClient();

const MINUTO = 60_000;
const PREFIXO = "teste-prisma:";

const politica: PoliticaRateLimit = {
  nome: "teste",
  limiteFalhas: 3,
  janelaFalhasMs: 10 * MINUTO,
  bloqueiosMs: [1 * MINUTO, 5 * MINUTO, 15 * MINUTO],
};

/**
 * Relógio controlado, para exercitar expiração e backoff sem esperar tempo
 * real. O store recebe o relógio por injeção, igual ao motor.
 */
let agora = 0;

function criarStore() {
  return new RateLimitStorePrisma(prisma, () => agora);
}

async function limpar() {
  await prisma.registroRateLimit.deleteMany({
    where: { chave: { startsWith: PREFIXO } },
  });
}

beforeEach(async () => {
  agora = new Date("2026-09-07T12:00:00.000Z").getTime();
  await limpar();
});

afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("RateLimitStorePrisma", () => {
  it("persiste e devolve o registro gravado", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}persiste`;

    await store.gravar(
      chave,
      { falhas: 2, bloqueadoAte: agora + MINUTO, ultimaFalhaEm: agora },
      10 * MINUTO
    );

    expect(await store.ler(chave)).toEqual({
      falhas: 2,
      bloqueadoAte: agora + MINUTO,
      ultimaFalhaEm: agora,
    });
  });

  it("preserva bloqueadoAte nulo", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}sem-bloqueio`;

    await store.gravar(
      chave,
      { falhas: 1, bloqueadoAte: null, ultimaFalhaEm: agora },
      10 * MINUTO
    );

    expect((await store.ler(chave))?.bloqueadoAte).toBeNull();
  });

  it("sobrescreve o registro na segunda gravação", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}sobrescreve`;

    await store.gravar(chave, { falhas: 1, bloqueadoAte: null, ultimaFalhaEm: agora }, MINUTO);
    await store.gravar(chave, { falhas: 7, bloqueadoAte: null, ultimaFalhaEm: agora }, MINUTO);

    expect((await store.ler(chave))?.falhas).toBe(7);
  });

  it("devolve null para chave inexistente", async () => {
    expect(await criarStore().ler(`${PREFIXO}nao-existe`)).toBeNull();
  });

  it("trata registro expirado como ausente", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}expirado`;

    await store.gravar(chave, { falhas: 3, bloqueadoAte: null, ultimaFalhaEm: agora }, MINUTO);

    expect(await store.ler(chave)).not.toBeNull();

    agora += MINUTO + 1;

    expect(await store.ler(chave)).toBeNull();
  });

  it("remove sem falhar em chave inexistente", async () => {
    const store = criarStore();

    await expect(store.remover(`${PREFIXO}nao-existe`)).resolves.toBeUndefined();
  });

  it("remove o registro persistido", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}remove`;

    await store.gravar(chave, { falhas: 3, bloqueadoAte: null, ultimaFalhaEm: agora }, MINUTO);
    await store.remover(chave);

    expect(await store.ler(chave)).toBeNull();
    expect(await prisma.registroRateLimit.findUnique({ where: { chave } })).toBeNull();
  });

  it("podarExpirados apaga só o que já venceu", async () => {
    const store = criarStore();
    const vencido = `${PREFIXO}vencido`;
    const vigente = `${PREFIXO}vigente`;

    await store.gravar(vencido, { falhas: 1, bloqueadoAte: null, ultimaFalhaEm: agora }, MINUTO);
    await store.gravar(
      vigente,
      { falhas: 1, bloqueadoAte: null, ultimaFalhaEm: agora },
      60 * MINUTO
    );

    agora += 2 * MINUTO;

    await store.podarExpirados();

    expect(await prisma.registroRateLimit.findUnique({ where: { chave: vencido } })).toBeNull();
    expect(
      await prisma.registroRateLimit.findUnique({ where: { chave: vigente } })
    ).not.toBeNull();
  });

  it("isola chaves diferentes", async () => {
    const store = criarStore();

    await store.gravar(`${PREFIXO}a`, { falhas: 5, bloqueadoAte: null, ultimaFalhaEm: agora }, MINUTO);

    expect(await store.ler(`${PREFIXO}b`)).toBeNull();
  });
});

describe("motor sobre o store Prisma", () => {
  it("bloqueia no limite e libera quando a janela expira", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}motor`;

    for (let i = 0; i < politica.limiteFalhas; i += 1) {
      await registrarFalha(store, politica, chave, agora);
    }

    const bloqueado = await verificarBloqueio(store, politica, chave, agora);
    expect(bloqueado.bloqueado).toBe(true);

    agora += MINUTO + 1;

    expect(await verificarBloqueio(store, politica, chave, agora)).toEqual({ bloqueado: false });
  });

  it("aplica backoff progressivo atravessando o banco", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}backoff`;

    await registrarFalha(store, politica, chave, agora);
    await registrarFalha(store, politica, chave, agora);

    const terceira = await registrarFalha(store, politica, chave, agora);
    expect(terceira.registro.bloqueadoAte).toBe(agora + 1 * MINUTO);

    agora += MINUTO + 1;
    const quarta = await registrarFalha(store, politica, chave, agora);
    expect(quarta.registro.bloqueadoAte).toBe(agora + 5 * MINUTO);
  });

  it("sucesso zera o contador persistido", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}sucesso`;

    for (let i = 0; i < politica.limiteFalhas; i += 1) {
      await registrarFalha(store, politica, chave, agora);
    }

    await registrarSucesso(store, chave);

    expect(await verificarBloqueio(store, politica, chave, agora)).toEqual({ bloqueado: false });

    const nova = await registrarFalha(store, politica, chave, agora);
    expect(nova.registro.falhas).toBe(1);
  });

  it("zera o contador após a janela de inatividade, sem herdar o valor antigo", async () => {
    const store = criarStore();
    const chave = `${PREFIXO}janela`;

    await registrarFalha(store, politica, chave, agora);
    await registrarFalha(store, politica, chave, agora);

    agora += 10 * MINUTO + 1;

    // A linha antiga ainda existe no banco (expiraEm é maior que a janela):
    // é o motor que precisa desprezar o histórico, não o store.
    const nova = await registrarFalha(store, politica, chave, agora);

    expect(nova.registro.falhas).toBe(1);
    expect(nova.bloqueioArmado).toBe(false);
  });

  it("o estado sobrevive a uma nova instância do store", async () => {
    const chave = `${PREFIXO}instancias`;

    for (let i = 0; i < politica.limiteFalhas; i += 1) {
      await registrarFalha(criarStore(), politica, chave, agora);
    }

    // É esta propriedade que o store em memória não tem: o bloqueio vale
    // para qualquer instância serverless, não só para a que contou as falhas.
    const outra = await verificarBloqueio(criarStore(), politica, chave, agora);

    expect(outra.bloqueado).toBe(true);
  });
});
