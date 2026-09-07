import { createHash } from "crypto";

import {
  PoliticaRateLimit,
  RateLimitStore,
  RateLimitStoreMemoria,
  registrarFalha,
  registrarSucesso,
  verificarBloqueio,
} from "@/lib/rate-limit";

/**
 * Política principal: par (IP, e-mail).
 *
 * A chave é o par, e não o e-mail isolado, de propósito. Travar por e-mail
 * permitiria que um atacante de fora derrubasse o acesso do operador no
 * balcão só martelando o e-mail dele. Com o par, o bloqueio atinge apenas a
 * origem que está errando.
 */
export const POLITICA_LOGIN_EMAIL_IP: PoliticaRateLimit = {
  nome: "login:email+ip",
  limiteFalhas: 5,
  janelaFalhasMs: 15 * 60_000,
  bloqueiosMs: [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000],
};

/**
 * Política secundária: IP isolado, com limite mais alto.
 *
 * Cobre o caso que a política do par não cobre — varredura de senha contra
 * muitos e-mails diferentes a partir da mesma origem, em que nenhum par
 * chega perto do próprio limite.
 */
export const POLITICA_LOGIN_IP: PoliticaRateLimit = {
  nome: "login:ip",
  limiteFalhas: 20,
  janelaFalhasMs: 15 * 60_000,
  bloqueiosMs: [5 * 60_000, 15 * 60_000, 30 * 60_000],
};

export const IP_DESCONHECIDO = "desconhecido";

/**
 * Extrai o IP do cliente dos cabeçalhos de proxy.
 *
 * Estes cabeçalhos só são confiáveis porque a aplicação fica atrás da borda
 * da Vercel, que os reescreve. Em execução exposta diretamente eles são
 * forjáveis pelo cliente e a proteção por IP perde valor.
 */
export function extrairIpCliente(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();

  if (real) {
    return real;
  }

  const encaminhado = headers.get("x-forwarded-for");

  if (encaminhado) {
    const primeiro = encaminhado.split(",")[0]?.trim();

    if (primeiro) {
      return primeiro;
    }
  }

  return IP_DESCONHECIDO;
}

/**
 * Deriva a chave de armazenamento. O identificador é um hash truncado: o
 * store nunca guarda e-mail nem IP em claro.
 */
export function derivarChave(politica: PoliticaRateLimit, ...partes: string[]): string {
  const digest = createHash("sha256").update(partes.join("|")).digest("hex");

  return `${politica.nome}:${digest.slice(0, 32)}`;
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ChavesLogin = {
  emailIp: string;
  ip: string;
};

export function derivarChavesLogin(email: string, ip: string): ChavesLogin {
  return {
    emailIp: derivarChave(POLITICA_LOGIN_EMAIL_IP, ip, normalizarEmail(email)),
    ip: derivarChave(POLITICA_LOGIN_IP, ip),
  };
}

export type BloqueioLogin = {
  politica: string;
  liberaEm: number;
  retryAfterSegundos: number;
};

/**
 * Consulta as duas políticas e devolve o bloqueio mais restritivo, ou `null`
 * quando a tentativa pode prosseguir. Deve rodar antes de `autenticarUsuario`.
 */
export async function consultarBloqueioLogin(
  store: RateLimitStore,
  chaves: ChavesLogin,
  agora: number
): Promise<BloqueioLogin | null> {
  const avaliacoes = [
    { politica: POLITICA_LOGIN_EMAIL_IP, chave: chaves.emailIp },
    { politica: POLITICA_LOGIN_IP, chave: chaves.ip },
  ];

  let maisRestritivo: BloqueioLogin | null = null;

  for (const { politica, chave } of avaliacoes) {
    const resultado = await verificarBloqueio(store, politica, chave, agora);

    if (resultado.bloqueado && (!maisRestritivo || resultado.liberaEm > maisRestritivo.liberaEm)) {
      maisRestritivo = {
        politica: politica.nome,
        liberaEm: resultado.liberaEm,
        retryAfterSegundos: resultado.retryAfterSegundos,
      };
    }
  }

  return maisRestritivo;
}

/** Contabiliza a falha nas duas políticas. */
export async function registrarFalhaLogin(
  store: RateLimitStore,
  chaves: ChavesLogin,
  agora: number
): Promise<{ bloqueioArmado: boolean; falhasEmailIp: number }> {
  const porPar = await registrarFalha(store, POLITICA_LOGIN_EMAIL_IP, chaves.emailIp, agora);
  const porIp = await registrarFalha(store, POLITICA_LOGIN_IP, chaves.ip, agora);

  return {
    bloqueioArmado: porPar.bloqueioArmado || porIp.bloqueioArmado,
    falhasEmailIp: porPar.registro.falhas,
  };
}

/** Zera as duas políticas após login bem-sucedido. */
export async function registrarSucessoLogin(
  store: RateLimitStore,
  chaves: ChavesLogin
): Promise<void> {
  await registrarSucesso(store, chaves.emailIp);
  await registrarSucesso(store, chaves.ip);
}

/**
 * Mensagem de recusa por excesso de tentativas.
 *
 * É deliberadamente idêntica para e-mail existente e inexistente: junto com o
 * status 429 uniforme, é o que impede que a resposta de bloqueio sirva para
 * enumerar usuários.
 */
export function mensagemBloqueio(retryAfterSegundos: number): string {
  const minutos = Math.ceil(retryAfterSegundos / 60);

  return `Muitas tentativas de login. Tente novamente em ${minutos} ${
    minutos === 1 ? "minuto" : "minutos"
  }.`;
}

let storeCompartilhado: RateLimitStore | null = null;

/**
 * Store usado pela rota de login.
 *
 * Hoje é o store em memória do processo — melhor esforço em serverless, ver a
 * limitação documentada em `RateLimitStoreMemoria`. Para trocar por um store
 * compartilhado (banco ou Redis), basta retornar outra implementação de
 * `RateLimitStore` aqui: política, rota e testes continuam iguais.
 */
export function obterStoreLogin(): RateLimitStore {
  if (!storeCompartilhado) {
    storeCompartilhado = new RateLimitStoreMemoria();
  }

  return storeCompartilhado;
}

/** Exposto para os testes isolarem o estado entre casos. */
export function redefinirStoreLogin(store: RateLimitStore | null = null): void {
  storeCompartilhado = store;
}
