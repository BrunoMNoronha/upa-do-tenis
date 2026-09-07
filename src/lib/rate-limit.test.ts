import { describe, expect, it } from "vitest";

import {
  PoliticaRateLimit,
  RateLimitStoreMemoria,
  registrarFalha,
  registrarSucesso,
  verificarBloqueio,
} from "./rate-limit";

const MINUTO = 60_000;

const politica: PoliticaRateLimit = {
  nome: "teste",
  limiteFalhas: 3,
  janelaFalhasMs: 10 * MINUTO,
  bloqueiosMs: [1 * MINUTO, 5 * MINUTO, 15 * MINUTO],
};

/** Relógio controlado: o motor nunca lê `Date.now()` por conta própria. */
function criarCenario(inicio = 1_700_000_000_000) {
  let agora = inicio;
  const store = new RateLimitStoreMemoria(() => agora);

  return {
    store,
    get agora() {
      return agora;
    },
    avancar(ms: number) {
      agora += ms;
    },
    falhar() {
      return registrarFalha(store, politica, "chave", agora);
    },
    verificar() {
      return verificarBloqueio(store, politica, "chave", agora);
    },
  };
}

describe("verificarBloqueio", () => {
  it("libera chave sem histórico", async () => {
    const cenario = criarCenario();

    expect(await cenario.verificar()).toEqual({ bloqueado: false });
  });

  it("libera enquanto as falhas estão dentro do limite", async () => {
    const cenario = criarCenario();

    await cenario.falhar();
    await cenario.falhar();

    expect(await cenario.verificar()).toEqual({ bloqueado: false });
  });

  it("recusa após atingir o limite de falhas consecutivas", async () => {
    const cenario = criarCenario();

    await cenario.falhar();
    await cenario.falhar();
    await cenario.falhar();

    const resultado = await cenario.verificar();

    expect(resultado.bloqueado).toBe(true);

    if (resultado.bloqueado) {
      expect(resultado.retryAfterSegundos).toBe(60);
      expect(resultado.liberaEm).toBe(cenario.agora + MINUTO);
    }
  });

  it("volta a permitir quando a janela de bloqueio expira", async () => {
    const cenario = criarCenario();

    await cenario.falhar();
    await cenario.falhar();
    await cenario.falhar();

    expect((await cenario.verificar()).bloqueado).toBe(true);

    cenario.avancar(MINUTO + 1);

    expect(await cenario.verificar()).toEqual({ bloqueado: false });
  });

  it("arredonda o Retry-After para cima, nunca para zero", async () => {
    const cenario = criarCenario();

    await cenario.falhar();
    await cenario.falhar();
    await cenario.falhar();

    cenario.avancar(MINUTO - 200);

    const resultado = await cenario.verificar();

    expect(resultado.bloqueado).toBe(true);

    if (resultado.bloqueado) {
      expect(resultado.retryAfterSegundos).toBe(1);
    }
  });
});

describe("registrarFalha", () => {
  it("sinaliza o bloqueio exatamente na falha que atinge o limite", async () => {
    const cenario = criarCenario();

    expect((await cenario.falhar()).bloqueioArmado).toBe(false);
    expect((await cenario.falhar()).bloqueioArmado).toBe(false);
    expect((await cenario.falhar()).bloqueioArmado).toBe(true);
  });

  it("aplica backoff progressivo a cada nova falha após o limite", async () => {
    const cenario = criarCenario();

    await cenario.falhar();
    await cenario.falhar();

    const terceira = await cenario.falhar();
    expect(terceira.registro.bloqueadoAte).toBe(cenario.agora + 1 * MINUTO);

    cenario.avancar(MINUTO + 1);
    const quarta = await cenario.falhar();
    expect(quarta.registro.bloqueadoAte).toBe(cenario.agora + 5 * MINUTO);

    cenario.avancar(5 * MINUTO + 1);
    const quinta = await cenario.falhar();
    expect(quinta.registro.bloqueadoAte).toBe(cenario.agora + 15 * MINUTO);
  });

  it("mantém o teto de backoff após esgotar a escala", async () => {
    const cenario = criarCenario();

    // Falhas 1 e 2 não bloqueiam; a 3ª atinge o limite e entra na escala.
    await cenario.falhar();
    await cenario.falhar();

    // Falha nº → bloqueio esperado, com o teto de 15 min se repetindo.
    const escala = [1 * MINUTO, 5 * MINUTO, 15 * MINUTO, 15 * MINUTO, 15 * MINUTO];

    for (const esperado of escala) {
      const resultado = await cenario.falhar();

      expect(resultado.registro.bloqueadoAte).toBe(cenario.agora + esperado);

      cenario.avancar(esperado + 1);
    }
  });

  it("zera o contador após a janela de inatividade", async () => {
    const cenario = criarCenario();

    await cenario.falhar();
    await cenario.falhar();

    cenario.avancar(10 * MINUTO + 1);

    const resultado = await cenario.falhar();

    expect(resultado.registro.falhas).toBe(1);
    expect(resultado.bloqueioArmado).toBe(false);
  });

  it("preserva a escalada quando o bloqueio dura mais que a janela de inatividade", async () => {
    const cenario = criarCenario();

    // Chega ao terceiro nível de backoff (15 min > janela de 10 min).
    await cenario.falhar();
    await cenario.falhar();
    await cenario.falhar();
    cenario.avancar(MINUTO + 1);
    await cenario.falhar();
    cenario.avancar(5 * MINUTO + 1);
    await cenario.falhar();

    // Espera o bloqueio de 15 min terminar, sem nova tentativa no meio.
    cenario.avancar(15 * MINUTO + 1);

    // O histórico não pode ter sido apagado pela janela de inatividade: a
    // próxima falha precisa reincidir no teto, e não voltar ao primeiro nível.
    const resultado = await cenario.falhar();

    expect(resultado.registro.falhas).toBe(6);
    expect(resultado.registro.bloqueadoAte).toBe(cenario.agora + 15 * MINUTO);
  });
});

describe("registrarSucesso", () => {
  it("zera o histórico e libera a chave", async () => {
    const cenario = criarCenario();

    await cenario.falhar();
    await cenario.falhar();
    await cenario.falhar();

    expect((await cenario.verificar()).bloqueado).toBe(true);

    await registrarSucesso(cenario.store, "chave");

    expect(await cenario.verificar()).toEqual({ bloqueado: false });

    // O contador precisa recomeçar do zero, não retomar de onde parou.
    const resultado = await cenario.falhar();
    expect(resultado.registro.falhas).toBe(1);
    expect(resultado.bloqueioArmado).toBe(false);
  });
});

describe("RateLimitStoreMemoria", () => {
  it("isola chaves diferentes", async () => {
    let agora = 1_700_000_000_000;
    const store = new RateLimitStoreMemoria(() => agora);

    await registrarFalha(store, politica, "chave-a", agora);
    await registrarFalha(store, politica, "chave-a", agora);
    await registrarFalha(store, politica, "chave-a", agora);

    expect((await verificarBloqueio(store, politica, "chave-a", agora)).bloqueado).toBe(true);
    expect((await verificarBloqueio(store, politica, "chave-b", agora)).bloqueado).toBe(false);
  });

  it("descarta registros expirados na leitura", async () => {
    let agora = 1_700_000_000_000;
    const store = new RateLimitStoreMemoria(() => agora);

    await registrarFalha(store, politica, "chave", agora);

    expect(await store.ler("chave")).not.toBeNull();

    // Vida útil é janela + max(janela, bloqueio restante); 30 min cobre.
    agora += 30 * MINUTO;

    expect(await store.ler("chave")).toBeNull();
  });
});
