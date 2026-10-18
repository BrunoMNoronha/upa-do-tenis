import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const banco = vi.hoisted(() => new Map<string, string>());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    configuracaoSistema: {
      findUnique: vi.fn(async ({ where }: { where: { chave: string } }) => {
        const valor = banco.get(where.chave);
        return valor === undefined ? null : { chave: where.chave, valor, atualizadoEm: new Date() };
      }),
      upsert: vi.fn(async ({ where, update }: { where: { chave: string }; update: { valor: string } }) => {
        banco.set(where.chave, update.valor);
      }),
    },
  },
}));

import {
  CHAVE_CONFIG_CLAUDE_API_KEY,
  chaveClaudeSchema,
  obterChaveClaude,
  obterStatusChaveClaude,
  removerChaveClaude,
  salvarChaveClaude,
} from "./insights-config";

const SEGREDO_ORIGINAL = process.env.AUTH_SESSION_SECRET;
const CHAVE = "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWX-wxyz";

describe("insights-config", () => {
  beforeEach(() => {
    banco.clear();
    process.env.AUTH_SESSION_SECRET = "segredo-de-teste-0123456789";
  });

  afterEach(() => {
    process.env.AUTH_SESSION_SECRET = SEGREDO_ORIGINAL;
  });

  it("persiste a chave cifrada e a recupera em claro só pelo servidor", async () => {
    const status = await salvarChaveClaude(`  ${CHAVE}  `);

    expect(status).toEqual({ configurada: true, ultimosQuatro: "wxyz" });
    expect(banco.get(CHAVE_CONFIG_CLAUDE_API_KEY)).not.toContain(CHAVE);
    expect(await obterChaveClaude()).toBe(CHAVE);
    expect(await obterStatusChaveClaude()).toEqual({ configurada: true, ultimosQuatro: "wxyz" });
  });

  it("informa não configurada sem chave ou após remoção", async () => {
    expect(await obterStatusChaveClaude()).toEqual({ configurada: false, ultimosQuatro: null });

    await salvarChaveClaude(CHAVE);
    await removerChaveClaude();

    expect(await obterChaveClaude()).toBeNull();
    expect(await obterStatusChaveClaude()).toEqual({ configurada: false, ultimosQuatro: null });
  });

  it("degrada para não configurada quando o segredo do servidor muda", async () => {
    await salvarChaveClaude(CHAVE);
    process.env.AUTH_SESSION_SECRET = "segredo-rotacionado-0123456789";

    expect(await obterStatusChaveClaude()).toEqual({ configurada: false, ultimosQuatro: null });
  });

  it("valida o formato da chave", () => {
    expect(chaveClaudeSchema.safeParse({ apiKey: CHAVE }).success).toBe(true);
    expect(chaveClaudeSchema.safeParse({ apiKey: "sk-ant-curta" }).success).toBe(false);
    expect(chaveClaudeSchema.safeParse({ apiKey: "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ" }).success).toBe(false);
    expect(chaveClaudeSchema.safeParse({}).success).toBe(false);
  });
});
