import { describe, expect, it } from "vitest";

import { RateLimitStoreMemoria } from "./rate-limit";
import {
  IP_DESCONHECIDO,
  POLITICA_LOGIN_EMAIL_IP,
  POLITICA_LOGIN_IP,
  consultarBloqueioLogin,
  derivarChave,
  derivarChavesLogin,
  extrairIpCliente,
  mensagemBloqueio,
  registrarFalhaLogin,
  registrarSucessoLogin,
} from "./login-rate-limit";

const MINUTO = 60_000;
const INICIO = 1_700_000_000_000;

function criarCenario(inicio = INICIO) {
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
    falhar(email: string, ip: string) {
      return registrarFalhaLogin(store, derivarChavesLogin(email, ip), agora);
    },
    consultar(email: string, ip: string) {
      return consultarBloqueioLogin(store, derivarChavesLogin(email, ip), agora);
    },
    suceder(email: string, ip: string) {
      return registrarSucessoLogin(store, derivarChavesLogin(email, ip));
    },
  };
}

describe("extrairIpCliente", () => {
  it("prefere x-real-ip", () => {
    const headers = new Headers({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    });

    expect(extrairIpCliente(headers)).toBe("203.0.113.7");
  });

  it("usa o primeiro endereço de x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" });

    expect(extrairIpCliente(headers)).toBe("198.51.100.1");
  });

  it("retorna marcador quando não há cabeçalho de origem", () => {
    expect(extrairIpCliente(new Headers())).toBe(IP_DESCONHECIDO);
  });
});

describe("derivarChave", () => {
  it("não expõe e-mail nem IP em claro", () => {
    const chave = derivarChave(POLITICA_LOGIN_EMAIL_IP, "203.0.113.7", "bruno@exemplo.com");

    expect(chave).not.toContain("bruno@exemplo.com");
    expect(chave).not.toContain("203.0.113.7");
    expect(chave.startsWith(`${POLITICA_LOGIN_EMAIL_IP.nome}:`)).toBe(true);
  });

  it("normaliza o e-mail para a mesma chave", () => {
    const a = derivarChavesLogin("  Bruno@Exemplo.com ", "203.0.113.7");
    const b = derivarChavesLogin("bruno@exemplo.com", "203.0.113.7");

    expect(a.emailIp).toBe(b.emailIp);
  });

  it("separa chaves por política, IP e e-mail", () => {
    const base = derivarChavesLogin("bruno@exemplo.com", "203.0.113.7");

    expect(base.emailIp).not.toBe(base.ip);
    expect(derivarChavesLogin("bruno@exemplo.com", "198.51.100.1").emailIp).not.toBe(base.emailIp);
    expect(derivarChavesLogin("outro@exemplo.com", "203.0.113.7").emailIp).not.toBe(base.emailIp);
  });
});

describe("política por par e-mail + IP", () => {
  it("permite tentativas dentro do limite", async () => {
    const cenario = criarCenario();

    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas - 1; i += 1) {
      await cenario.falhar("bruno@exemplo.com", "203.0.113.7");
      expect(await cenario.consultar("bruno@exemplo.com", "203.0.113.7")).toBeNull();
    }
  });

  it("recusa acima do limite", async () => {
    const cenario = criarCenario();

    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      await cenario.falhar("bruno@exemplo.com", "203.0.113.7");
    }

    const bloqueio = await cenario.consultar("bruno@exemplo.com", "203.0.113.7");

    expect(bloqueio).not.toBeNull();
    expect(bloqueio?.politica).toBe(POLITICA_LOGIN_EMAIL_IP.nome);
    expect(bloqueio?.retryAfterSegundos).toBe(60);
  });

  it("libera quando a janela expira", async () => {
    const cenario = criarCenario();

    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      await cenario.falhar("bruno@exemplo.com", "203.0.113.7");
    }

    expect(await cenario.consultar("bruno@exemplo.com", "203.0.113.7")).not.toBeNull();

    cenario.avancar(MINUTO + 1);

    expect(await cenario.consultar("bruno@exemplo.com", "203.0.113.7")).toBeNull();
  });

  it("sucesso zera o contador", async () => {
    const cenario = criarCenario();

    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas - 1; i += 1) {
      await cenario.falhar("bruno@exemplo.com", "203.0.113.7");
    }

    await cenario.suceder("bruno@exemplo.com", "203.0.113.7");

    // Recomeçando do zero, uma falha isolada não pode bloquear.
    await cenario.falhar("bruno@exemplo.com", "203.0.113.7");

    expect(await cenario.consultar("bruno@exemplo.com", "203.0.113.7")).toBeNull();
  });

  it("não trava o operador legítimo quando o ataque vem de outro IP", async () => {
    const cenario = criarCenario();
    const atacante = "198.51.100.1";
    const balcao = "203.0.113.7";

    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      await cenario.falhar("bruno@exemplo.com", atacante);
    }

    expect(await cenario.consultar("bruno@exemplo.com", atacante)).not.toBeNull();
    expect(await cenario.consultar("bruno@exemplo.com", balcao)).toBeNull();
  });
});

describe("política por IP", () => {
  it("pega varredura contra muitos e-mails do mesmo IP", async () => {
    const cenario = criarCenario();
    const ip = "198.51.100.1";

    // Nenhum par chega perto do próprio limite (4 falhas cada, limite 5),
    // mas o total de falhas do IP atinge o limite da política de IP.
    const porEmail = POLITICA_LOGIN_EMAIL_IP.limiteFalhas - 1;
    const emails = POLITICA_LOGIN_IP.limiteFalhas / porEmail;

    for (let e = 0; e < emails; e += 1) {
      for (let i = 0; i < porEmail; i += 1) {
        await cenario.falhar(`usuario${e}@exemplo.com`, ip);
      }
    }

    const bloqueio = await cenario.consultar("qualquer@exemplo.com", ip);

    expect(bloqueio).not.toBeNull();
    expect(bloqueio?.politica).toBe(POLITICA_LOGIN_IP.nome);
  });

  it("não afeta outros IPs", async () => {
    const cenario = criarCenario();

    for (let i = 0; i < POLITICA_LOGIN_IP.limiteFalhas; i += 1) {
      await cenario.falhar(`usuario${i}@exemplo.com`, "198.51.100.1");
    }

    expect(await cenario.consultar("bruno@exemplo.com", "203.0.113.7")).toBeNull();
  });
});

describe("consultarBloqueioLogin", () => {
  it("devolve o bloqueio mais restritivo quando as duas políticas estouram", async () => {
    const cenario = criarCenario();
    const ip = "198.51.100.1";
    const porEmail = POLITICA_LOGIN_EMAIL_IP.limiteFalhas;

    // O par do alvo estoura primeiro, no bloqueio mínimo de 1 min.
    for (let i = 0; i < porEmail; i += 1) {
      await cenario.falhar("bruno@exemplo.com", ip);
    }

    // Falhas contra outros e-mails do mesmo IP levam a política de IP ao seu
    // próprio limite, cujo primeiro bloqueio é de 5 min.
    const restantes = POLITICA_LOGIN_IP.limiteFalhas - porEmail;

    for (let i = 0; i < restantes; i += 1) {
      await cenario.falhar(`usuario${i}@exemplo.com`, ip);
    }

    const bloqueio = await cenario.consultar("bruno@exemplo.com", ip);

    // Vence o de liberação mais distante — o de IP —, não o primeiro avaliado.
    expect(bloqueio?.politica).toBe(POLITICA_LOGIN_IP.nome);
    expect(bloqueio?.retryAfterSegundos).toBe(5 * 60);
  });
});

describe("mensagemBloqueio", () => {
  it("não revela existência de conta e informa a espera", () => {
    expect(mensagemBloqueio(60)).toBe("Muitas tentativas de login. Tente novamente em 1 minuto.");
    expect(mensagemBloqueio(300)).toBe("Muitas tentativas de login. Tente novamente em 5 minutos.");
  });

  it("arredonda frações de minuto para cima", () => {
    expect(mensagemBloqueio(1)).toBe("Muitas tentativas de login. Tente novamente em 1 minuto.");
    expect(mensagemBloqueio(61)).toBe("Muitas tentativas de login. Tente novamente em 2 minutos.");
  });
});
