/**
 * Verificação de reCAPTCHA v3 no login (issue #123).
 *
 * Camada complementar ao rate limiting da #82: as políticas por IP não
 * enxergam um atacante distribuído em muitos IPs, e é esse o cenário que o
 * captcha cobre. A verificação roda **depois** do bloqueio do rate limit
 * (leitura barata no banco) e **antes** de `autenticarUsuario` (scrypt, o
 * custo mais alto da rota).
 *
 * O módulo é desligado quando as chaves não estão configuradas, o que mantém
 * dev, testes e CI sem dependência do Google.
 */

export const CAPTCHA_ACAO_LOGIN = "login";
export const CAPTCHA_SCORE_MINIMO_PADRAO = 0.5;
export const CAPTCHA_TIMEOUT_MS = 5_000;

const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export type ConfigCaptcha = {
  ativo: boolean;
  siteKey: string | null;
  secretKey: string | null;
  scoreMinimo: number;
};

/**
 * Lê a configuração do ambiente. O captcha só fica ativo com as duas chaves
 * presentes; `RECAPTCHA_SCORE_MINIMO` fora de [0, 1] (ou não numérico) cai
 * no padrão em vez de derrubar o login.
 */
export type EnvCaptcha = Record<string, string | undefined>;

export function obterConfigCaptcha(env: EnvCaptcha = process.env): ConfigCaptcha {
  const siteKey = env.RECAPTCHA_SITE_KEY?.trim() || null;
  const secretKey = env.RECAPTCHA_SECRET_KEY?.trim() || null;

  return {
    ativo: Boolean(siteKey && secretKey),
    siteKey,
    secretKey,
    scoreMinimo: interpretarScoreMinimo(env.RECAPTCHA_SCORE_MINIMO),
  };
}

export function interpretarScoreMinimo(valor: string | undefined): number {
  if (valor === undefined || valor.trim() === "") {
    return CAPTCHA_SCORE_MINIMO_PADRAO;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0 || numero > 1) {
    return CAPTCHA_SCORE_MINIMO_PADRAO;
  }

  return numero;
}

export type ResultadoCaptcha =
  /** Token válido, ação correta e score acima do mínimo. */
  | { status: "ok"; score: number }
  /** Google respondeu e recusou: token ausente/inválido, ação errada ou score baixo. */
  | { status: "recusado"; motivo: string; score?: number }
  /** Não foi possível consultar o Google (rede, timeout, 5xx, resposta ilegível). */
  | { status: "indisponivel"; motivo: string };

type RespostaSiteverify = {
  success?: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

export type OpcoesVerificacao = {
  ip?: string;
  config?: ConfigCaptcha;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Valida o token do cliente contra o `siteverify`.
 *
 * A distinção entre `recusado` e `indisponivel` importa: a rota falha fechado
 * na primeira (o Google respondeu e disse não) e falha aberto na segunda
 * (não houve resposta útil). Falhar aberto nunca concede acesso — a
 * tentativa apenas segue para a verificação normal de senha, ainda coberta
 * pelo rate limiting.
 */
export async function verificarCaptcha(
  token: string | undefined,
  opcoes: OpcoesVerificacao = {}
): Promise<ResultadoCaptcha> {
  const config = opcoes.config ?? obterConfigCaptcha();

  if (!config.ativo || !config.secretKey) {
    // Chamado com captcha desativado: comportamento neutro, sem rede.
    return { status: "ok", score: 1 };
  }

  if (!token) {
    return { status: "recusado", motivo: "token_ausente" };
  }

  const corpo = new URLSearchParams({ secret: config.secretKey, response: token });

  if (opcoes.ip) {
    corpo.set("remoteip", opcoes.ip);
  }

  const fetchImpl = opcoes.fetchImpl ?? fetch;
  let resposta: Response;

  try {
    resposta = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo.toString(),
      signal: AbortSignal.timeout(opcoes.timeoutMs ?? CAPTCHA_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      status: "indisponivel",
      motivo: error instanceof Error ? error.name || error.message : "erro desconhecido",
    };
  }

  if (!resposta.ok) {
    return { status: "indisponivel", motivo: `http_${resposta.status}` };
  }

  let dados: RespostaSiteverify;

  try {
    dados = (await resposta.json()) as RespostaSiteverify;
  } catch {
    return { status: "indisponivel", motivo: "resposta_ilegivel" };
  }

  if (dados.success !== true) {
    return {
      status: "recusado",
      motivo: dados["error-codes"]?.join(",") || "token_invalido",
    };
  }

  if (dados.action !== CAPTCHA_ACAO_LOGIN) {
    return { status: "recusado", motivo: "acao_invalida", score: dados.score };
  }

  const score = typeof dados.score === "number" ? dados.score : 0;

  if (score < config.scoreMinimo) {
    return { status: "recusado", motivo: "score_baixo", score };
  }

  return { status: "ok", score };
}

/**
 * Mensagem de recusa do captcha. Uniforme para e-mail cadastrado ou não: a
 * recusa acontece antes de qualquer consulta ao usuário.
 */
export const MENSAGEM_CAPTCHA_RECUSADO =
  "Não foi possível validar sua tentativa. Recarregue a página e tente novamente.";
