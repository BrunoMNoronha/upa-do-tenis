/**
 * Motor genérico de rate limiting por contagem de falhas consecutivas com
 * backoff progressivo.
 *
 * O motor é agnóstico de armazenamento: toda a persistência fica atrás da
 * interface `RateLimitStore`. Isso permite trocar o store (memória, banco,
 * Redis) sem alterar a política nem os testes de política.
 *
 * Nenhuma função deste módulo lê o relógio por conta própria — o instante
 * atual é sempre um parâmetro (`agora`, epoch em milissegundos). É o que
 * torna o backoff e a expiração de janela testáveis de forma determinística.
 */

export type RegistroTentativas = {
  /** Falhas consecutivas acumuladas na janela corrente. */
  falhas: number;
  /** Epoch (ms) até quando a chave está recusada; `null` quando liberada. */
  bloqueadoAte: number | null;
  /** Epoch (ms) da última falha registrada. */
  ultimaFalhaEm: number;
};

export type PoliticaRateLimit = {
  /** Identificador da política, usado em log estruturado. */
  nome: string;
  /** Falhas consecutivas toleradas antes de armar o bloqueio. */
  limiteFalhas: number;
  /** Inatividade que zera o contador de falhas. */
  janelaFalhasMs: number;
  /**
   * Durações de bloqueio aplicadas progressivamente a cada nova falha a
   * partir do limite. O último valor é o teto e se repete.
   */
  bloqueiosMs: readonly number[];
};

export type ResultadoVerificacao =
  | { bloqueado: false }
  | { bloqueado: true; liberaEm: number; retryAfterSegundos: number };

export type ResultadoFalha = {
  /** Estado gravado após computar a falha. */
  registro: RegistroTentativas;
  /** `true` quando esta falha armou (ou reforçou) o bloqueio. */
  bloqueioArmado: boolean;
};

export interface RateLimitStore {
  ler(chave: string): Promise<RegistroTentativas | null>;
  /**
   * Grava o registro. `expiraEmMs` é a vida útil restante do registro a
   * partir de `agora`, para stores capazes de expirar sozinhos (TTL do Redis,
   * coluna de expiração no banco, poda no store em memória).
   */
  gravar(chave: string, registro: RegistroTentativas, expiraEmMs: number): Promise<void>;
  remover(chave: string): Promise<void>;
}

function duracaoBloqueio(politica: PoliticaRateLimit, falhas: number): number {
  const indice = Math.min(
    Math.max(falhas - politica.limiteFalhas, 0),
    politica.bloqueiosMs.length - 1
  );

  return politica.bloqueiosMs[indice] ?? 0;
}

/**
 * Zera o contador quando a chave passou tempo suficiente sem falhas e sem
 * bloqueio ativo. A referência é a mais recente entre a última falha e o fim
 * do último bloqueio — sem isso, um bloqueio mais longo que a janela apagaria
 * o histórico e reiniciaria o backoff do zero.
 */
function normalizar(
  registro: RegistroTentativas | null,
  politica: PoliticaRateLimit,
  agora: number
): RegistroTentativas {
  if (!registro) {
    return { falhas: 0, bloqueadoAte: null, ultimaFalhaEm: 0 };
  }

  const referencia = Math.max(registro.ultimaFalhaEm, registro.bloqueadoAte ?? 0);

  if (agora - referencia > politica.janelaFalhasMs) {
    return { falhas: 0, bloqueadoAte: null, ultimaFalhaEm: 0 };
  }

  return registro;
}

function vidaUtilMs(
  registro: RegistroTentativas,
  politica: PoliticaRateLimit,
  agora: number
): number {
  const restanteBloqueio = registro.bloqueadoAte ? registro.bloqueadoAte - agora : 0;

  return Math.max(politica.janelaFalhasMs, restanteBloqueio) + politica.janelaFalhasMs;
}

/**
 * Consulta se a chave está recusada. Deve ser chamada **antes** de qualquer
 * verificação custosa de credencial: é o que impede que o bloqueio seja
 * contornado e que o endpoint sirva de vetor de exaustão de CPU.
 */
export async function verificarBloqueio(
  store: RateLimitStore,
  politica: PoliticaRateLimit,
  chave: string,
  agora: number
): Promise<ResultadoVerificacao> {
  const registro = await store.ler(chave);

  if (!registro || registro.bloqueadoAte === null || registro.bloqueadoAte <= agora) {
    return { bloqueado: false };
  }

  return {
    bloqueado: true,
    liberaEm: registro.bloqueadoAte,
    retryAfterSegundos: Math.max(1, Math.ceil((registro.bloqueadoAte - agora) / 1000)),
  };
}

/**
 * Contabiliza uma falha de credencial e arma o bloqueio quando o limite é
 * atingido. A tentativa que atinge o limite ainda é respondida como
 * credencial inválida; a seguinte já é recusada.
 */
export async function registrarFalha(
  store: RateLimitStore,
  politica: PoliticaRateLimit,
  chave: string,
  agora: number
): Promise<ResultadoFalha> {
  const base = normalizar(await store.ler(chave), politica, agora);
  const falhas = base.falhas + 1;
  const arma = falhas >= politica.limiteFalhas;

  const registro: RegistroTentativas = {
    falhas,
    bloqueadoAte: arma ? agora + duracaoBloqueio(politica, falhas) : null,
    ultimaFalhaEm: agora,
  };

  await store.gravar(chave, registro, vidaUtilMs(registro, politica, agora));

  return { registro, bloqueioArmado: arma };
}

/** Zera o histórico da chave após autenticação bem-sucedida. */
export async function registrarSucesso(
  store: RateLimitStore,
  chave: string
): Promise<void> {
  await store.remover(chave);
}

/**
 * Store em memória do processo.
 *
 * Limitação conhecida e aceita: em runtime serverless (Vercel) o estado é por
 * instância e não é compartilhado entre invocações, portanto a proteção é de
 * melhor esforço — reduz muito o custo/benefício da força bruta, mas não é
 * uma garantia global. A troca por um store compartilhado é uma
 * substituição desta classe, sem tocar na política.
 */
export class RateLimitStoreMemoria implements RateLimitStore {
  private readonly registros = new Map<string, { registro: RegistroTentativas; expiraEm: number }>();

  constructor(private readonly relogio: () => number = Date.now) {}

  async ler(chave: string): Promise<RegistroTentativas | null> {
    const entrada = this.registros.get(chave);

    if (!entrada) {
      return null;
    }

    if (entrada.expiraEm <= this.relogio()) {
      this.registros.delete(chave);
      return null;
    }

    return entrada.registro;
  }

  async gravar(
    chave: string,
    registro: RegistroTentativas,
    expiraEmMs: number
  ): Promise<void> {
    this.podar();
    this.registros.set(chave, { registro, expiraEm: this.relogio() + expiraEmMs });
  }

  async remover(chave: string): Promise<void> {
    this.registros.delete(chave);
  }

  /** Evita crescimento indefinido do Map em processos de longa duração. */
  private podar(): void {
    const agora = this.relogio();

    for (const [chave, entrada] of this.registros) {
      if (entrada.expiraEm <= agora) {
        this.registros.delete(chave);
      }
    }
  }
}
