import { describe, expect, it, vi } from "vitest";

import {
  CAPTCHA_SCORE_MINIMO_PADRAO,
  type ConfigCaptcha,
  interpretarScoreMinimo,
  obterConfigCaptcha,
  verificarCaptcha,
} from "./captcha";

const configAtiva: ConfigCaptcha = {
  ativo: true,
  siteKey: "site-key",
  secretKey: "secret-key",
  scoreMinimo: 0.5,
};

function fetchRespondendo(corpo: unknown, status = 200): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(corpo), { status })) as unknown as typeof fetch;
}

describe("obterConfigCaptcha", () => {
  it("fica inativo sem as duas chaves", () => {
    expect(obterConfigCaptcha({}).ativo).toBe(false);
    expect(obterConfigCaptcha({ RECAPTCHA_SITE_KEY: "s" }).ativo).toBe(false);
    expect(obterConfigCaptcha({ RECAPTCHA_SECRET_KEY: "k" }).ativo).toBe(false);
    expect(obterConfigCaptcha({ RECAPTCHA_SITE_KEY: "  ", RECAPTCHA_SECRET_KEY: "k" }).ativo).toBe(
      false
    );
  });

  it("fica ativo com as duas chaves e aplica o score do ambiente", () => {
    const config = obterConfigCaptcha({
      RECAPTCHA_SITE_KEY: "site",
      RECAPTCHA_SECRET_KEY: "secret",
      RECAPTCHA_SCORE_MINIMO: "0.7",
    });

    expect(config).toEqual({ ativo: true, siteKey: "site", secretKey: "secret", scoreMinimo: 0.7 });
  });
});

describe("interpretarScoreMinimo", () => {
  it("usa o padrão quando ausente, vazio, não numérico ou fora de [0, 1]", () => {
    for (const valor of [undefined, "", "  ", "abc", "-0.1", "1.5", "NaN"]) {
      expect(interpretarScoreMinimo(valor)).toBe(CAPTCHA_SCORE_MINIMO_PADRAO);
    }
  });

  it("aceita os limites 0 e 1", () => {
    expect(interpretarScoreMinimo("0")).toBe(0);
    expect(interpretarScoreMinimo("1")).toBe(1);
  });
});

describe("verificarCaptcha", () => {
  it("é neutro e não chama a rede quando desativado", async () => {
    const fetchImpl = vi.fn();

    const resultado = await verificarCaptcha(undefined, {
      config: { ativo: false, siteKey: null, secretKey: null, scoreMinimo: 0.5 },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(resultado).toEqual({ status: "ok", score: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("recusa token ausente sem chamar a rede", async () => {
    const fetchImpl = vi.fn();

    const resultado = await verificarCaptcha(undefined, {
      config: configAtiva,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(resultado).toEqual({ status: "recusado", motivo: "token_ausente" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("recusa token vazio sem chamar a rede", async () => {
    const fetchImpl = vi.fn();

    const resultado = await verificarCaptcha("", {
      config: configAtiva,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(resultado).toEqual({ status: "recusado", motivo: "token_ausente" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("envia secret, token e IP ao siteverify e aceita score acima do mínimo", async () => {
    const fetchImpl = fetchRespondendo({ success: true, score: 0.9, action: "login" });

    const resultado = await verificarCaptcha("tok", {
      config: configAtiva,
      fetchImpl,
      ip: "203.0.113.7",
    });

    expect(resultado).toEqual({ status: "ok", score: 0.9 });

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://www.google.com/recaptcha/api/siteverify");
    expect(init.method).toBe("POST");
    expect(String(init.body)).toBe("secret=secret-key&response=tok&remoteip=203.0.113.7");
  });

  it("aceita score exatamente no mínimo", async () => {
    const resultado = await verificarCaptcha("tok", {
      config: configAtiva,
      fetchImpl: fetchRespondendo({ success: true, score: 0.5, action: "login" }),
    });

    expect(resultado.status).toBe("ok");
  });

  it("recusa score abaixo do mínimo", async () => {
    const resultado = await verificarCaptcha("tok", {
      config: configAtiva,
      fetchImpl: fetchRespondendo({ success: true, score: 0.1, action: "login" }),
    });

    expect(resultado).toEqual({ status: "recusado", motivo: "score_baixo", score: 0.1 });
  });

  it("recusa token de outra ação, mesmo com score alto", async () => {
    const resultado = await verificarCaptcha("tok", {
      config: configAtiva,
      fetchImpl: fetchRespondendo({ success: true, score: 0.9, action: "cadastro" }),
    });

    expect(resultado).toMatchObject({ status: "recusado", motivo: "acao_invalida" });
  });

  it("recusa quando o Google responde success=false", async () => {
    const resultado = await verificarCaptcha("tok", {
      config: configAtiva,
      fetchImpl: fetchRespondendo({
        success: false,
        "error-codes": ["invalid-input-response", "timeout-or-duplicate"],
      }),
    });

    expect(resultado).toEqual({
      status: "recusado",
      motivo: "invalid-input-response,timeout-or-duplicate",
    });
  });

  it("trata score ausente como zero", async () => {
    const resultado = await verificarCaptcha("tok", {
      config: configAtiva,
      fetchImpl: fetchRespondendo({ success: true, action: "login" }),
    });

    expect(resultado).toEqual({ status: "recusado", motivo: "score_baixo", score: 0 });
  });

  it("reporta indisponível quando a rede falha", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    const resultado = await verificarCaptcha("tok", { config: configAtiva, fetchImpl });

    expect(resultado).toEqual({ status: "indisponivel", motivo: "TypeError" });
  });

  it("reporta indisponível em resposta HTTP não-2xx", async () => {
    const resultado = await verificarCaptcha("tok", {
      config: configAtiva,
      fetchImpl: fetchRespondendo({}, 503),
    });

    expect(resultado).toEqual({ status: "indisponivel", motivo: "http_503" });
  });

  it("reporta indisponível em corpo ilegível", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("<html>", { status: 200 })
    ) as unknown as typeof fetch;

    const resultado = await verificarCaptcha("tok", { config: configAtiva, fetchImpl });

    expect(resultado).toEqual({ status: "indisponivel", motivo: "resposta_ilegivel" });
  });

  it("reporta indisponível quando o siteverify estoura o timeout", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        })
    ) as unknown as typeof fetch;

    const resultado = await verificarCaptcha("tok", {
      config: configAtiva,
      fetchImpl,
      timeoutMs: 10,
    });

    expect(resultado).toEqual({ status: "indisponivel", motivo: "TimeoutError" });
  });
});
