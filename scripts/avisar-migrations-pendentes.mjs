// Aviso local de migrations pendentes, executado antes do `next dev` (#224).
//
// Somente leitura: compara `prisma/migrations` com `_prisma_migrations` do
// DATABASE_URL local e imprime um aviso destacado. Nunca aplica migrations e
// nunca impede o servidor de subir: sai sempre com código 0.
import { existsSync } from "node:fs";
import path from "node:path";

import { listarMigrationsDoDiretorio } from "../src/lib/migrations-esperadas.mjs";

// Mesma prioridade do `next dev` (o primeiro vence). `loadEnvFile` não
// sobrescreve variáveis já definidas, então a ordem abaixo é a de prioridade.
for (const arquivo of [".env.development.local", ".env.local", ".env.development", ".env"]) {
  if (existsSync(arquivo)) process.loadEnvFile(arquivo);
}

// Importado só depois de carregar o ambiente.
const { PrismaClient } = await import("@prisma/client");

const TEMPO_LIMITE_MS = 5000;

function avisar(linhas) {
  const faixa = "=".repeat(72);
  console.warn(["", faixa, ...linhas.map((linha) => `  ${linha}`), faixa, ""].join("\n"));
}

async function verificar() {
  if (!process.env.DATABASE_URL) {
    avisar(["[migrations] DATABASE_URL não definida: verificação de migrations pulada."]);
    return;
  }

  const esperadas = listarMigrationsDoDiretorio(path.join(process.cwd(), "prisma", "migrations"));
  const prisma = new PrismaClient();

  try {
    const linhas = await Promise.race([
      prisma.$queryRaw`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `,
      new Promise((_, rejeitar) =>
        setTimeout(() => rejeitar(new Error(`sem resposta em ${TEMPO_LIMITE_MS / 1000}s`)), TEMPO_LIMITE_MS).unref()
      ),
    ]);

    const aplicadas = new Set(linhas.map((linha) => linha.migration_name));
    const pendentes = esperadas.filter((nome) => !aplicadas.has(nome));

    if (pendentes.length > 0) {
      avisar([
        `[migrations] ATENÇÃO: ${pendentes.length} migration(s) pendente(s) no banco local.`,
        "A aplicação vai subir, mas telas que dependem dessas tabelas podem falhar.",
        ...pendentes.map((nome) => `- ${nome}`),
        "Confira o banco alvo e aplique: pnpm exec prisma migrate status && pnpm exec prisma migrate deploy",
      ]);
    }
  } catch (error) {
    const texto = error instanceof Error ? error.message : String(error);
    const mensagem = texto.split("\n").map((linha) => linha.trim()).filter(Boolean).pop() ?? "erro desconhecido";
    avisar([`[migrations] Não foi possível verificar migrations pendentes: ${mensagem}`]);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

await verificar().catch(() => {});
process.exit(0);
