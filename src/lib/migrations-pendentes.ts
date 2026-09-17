import type { PrismaClient } from "@prisma/client";

/**
 * Migrations versionadas no código, embutidas no bundle pelo `next.config.mjs`
 * (`env.MIGRATIONS_ESPERADAS`) a partir de `prisma/migrations`. A pasta não vai
 * garantidamente para o deployment da Vercel, por isso a lista é resolvida no
 * build, sem acesso ao banco.
 */
export function lerMigrationsEsperadas(valor: string | undefined = process.env.MIGRATIONS_ESPERADAS): string[] {
  if (!valor) {
    throw new Error("Lista de migrations esperadas indisponível (MIGRATIONS_ESPERADAS).");
  }

  const lista: unknown = JSON.parse(valor);

  if (!Array.isArray(lista) || !lista.every((nome) => typeof nome === "string")) {
    throw new Error("Lista de migrations esperadas inválida (MIGRATIONS_ESPERADAS).");
  }

  return lista;
}

/**
 * Migrations efetivamente aplicadas: concluídas e não revertidas. Uma
 * migration marcada com `prisma migrate resolve --applied` conta como
 * aplicada. Somente leitura.
 */
export async function buscarMigrationsAplicadas(
  cliente: Pick<PrismaClient, "$queryRaw">
): Promise<string[]> {
  const linhas = await cliente.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `;

  return linhas.map((linha) => linha.migration_name);
}

/** Migrations do código ausentes no banco, na ordem do código. */
export function calcularMigrationsPendentes(esperadas: string[], aplicadas: string[]): string[] {
  const conjuntoAplicadas = new Set(aplicadas);
  return esperadas.filter((nome) => !conjuntoAplicadas.has(nome));
}
