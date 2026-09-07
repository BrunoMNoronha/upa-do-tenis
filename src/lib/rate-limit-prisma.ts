import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { RateLimitStore, RegistroTentativas } from "@/lib/rate-limit";

/**
 * Store de rate limiting persistido no Postgres (issue #82, opção 1).
 *
 * Ao contrário do store em memória, o contador é compartilhado por todas as
 * instâncias: em runtime serverless o bloqueio passa a valer globalmente, e
 * não por invocação.
 *
 * Imprecisão conhecida e aceita: o motor lê, decide e grava, então
 * requisições concorrentes sobre a mesma chave podem ler o mesmo contador e
 * subcontar — o erro é limitado ao número de requisições em voo. Para um
 * limitador de login isso é irrelevante: o bloqueio ainda entra em vigor
 * em poucas tentativas, e nenhuma corrida consegue *encurtar* um bloqueio já
 * gravado por mais que uma janela de contagem.
 */

/** Intervalo mínimo entre podas oportunistas de registros expirados. */
const INTERVALO_PODA_MS = 5 * 60_000;

/** Só o delegate que este store usa, para facilitar a injeção nos testes. */
type ClienteRegistro = Pick<PrismaClient, "registroRateLimit">;

export class RateLimitStorePrisma implements RateLimitStore {
  private podadoEm = 0;

  constructor(
    private readonly db: ClienteRegistro = prisma,
    private readonly relogio: () => number = Date.now
  ) {}

  async ler(chave: string): Promise<RegistroTentativas | null> {
    const linha = await this.db.registroRateLimit.findUnique({ where: { chave } });

    if (!linha || linha.expiraEm.getTime() <= this.relogio()) {
      return null;
    }

    return {
      falhas: linha.falhas,
      bloqueadoAte: linha.bloqueadoAte ? linha.bloqueadoAte.getTime() : null,
      ultimaFalhaEm: linha.ultimaFalhaEm.getTime(),
    };
  }

  async gravar(
    chave: string,
    registro: RegistroTentativas,
    expiraEmMs: number
  ): Promise<void> {
    const dados = {
      falhas: registro.falhas,
      bloqueadoAte: registro.bloqueadoAte === null ? null : new Date(registro.bloqueadoAte),
      ultimaFalhaEm: new Date(registro.ultimaFalhaEm),
      expiraEm: new Date(this.relogio() + expiraEmMs),
    };

    await this.db.registroRateLimit.upsert({
      where: { chave },
      create: { chave, ...dados },
      update: dados,
    });

    await this.podarOportunisticamente();
  }

  async remover(chave: string): Promise<void> {
    // `deleteMany` e não `delete`: remover chave inexistente não é erro.
    await this.db.registroRateLimit.deleteMany({ where: { chave } });
  }

  /** Descarta registros já expirados. Seguro de rodar a qualquer momento. */
  async podarExpirados(): Promise<number> {
    const { count } = await this.db.registroRateLimit.deleteMany({
      where: { expiraEm: { lte: new Date(this.relogio()) } },
    });

    return count;
  }

  /**
   * Poda no máximo uma vez por `INTERVALO_PODA_MS`, e nunca propaga erro: a
   * limpeza é manutenção, não pode derrubar uma tentativa de login.
   */
  private async podarOportunisticamente(): Promise<void> {
    const agora = this.relogio();

    if (agora - this.podadoEm < INTERVALO_PODA_MS) {
      return;
    }

    this.podadoEm = agora;

    try {
      await this.podarExpirados();
    } catch (error) {
      console.warn(
        JSON.stringify({
          evento: "rate_limit_poda_falhou",
          em: new Date(agora).toISOString(),
        })
      );
      void error;
    }
  }
}
