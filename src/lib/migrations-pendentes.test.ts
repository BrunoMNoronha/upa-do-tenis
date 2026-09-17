import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { listarMigrationsDoDiretorio } from "./migrations-esperadas.mjs";
import {
  buscarMigrationsAplicadas,
  calcularMigrationsPendentes,
  lerMigrationsEsperadas,
} from "./migrations-pendentes";
import { prisma } from "./prisma";

const DIRETORIO_REAL = path.join(process.cwd(), "prisma", "migrations");

describe("listarMigrationsDoDiretorio", () => {
  let diretorio: string;

  beforeAll(() => {
    diretorio = mkdtempSync(path.join(tmpdir(), "upa-migrations-"));
    for (const nome of ["20260102000000_b", "20260101000000_a"]) {
      mkdirSync(path.join(diretorio, nome));
      writeFileSync(path.join(diretorio, nome, "migration.sql"), "SELECT 1;");
    }
    mkdirSync(path.join(diretorio, "20260103000000_sem_sql"));
    writeFileSync(path.join(diretorio, "migration_lock.toml"), 'provider = "postgresql"');
  });

  afterAll(() => {
    rmSync(diretorio, { recursive: true, force: true });
  });

  it("lista só pastas com migration.sql, em ordem", () => {
    expect(listarMigrationsDoDiretorio(diretorio)).toEqual(["20260101000000_a", "20260102000000_b"]);
  });

  it("a lista embutida pelo next.config bate com prisma/migrations", async () => {
    // Caminho em variável: o next.config.mjs não tem declaração de tipos.
    const caminhoConfig = pathToFileURL(path.join(process.cwd(), "next.config.mjs")).href;
    const nextConfig: { env?: Record<string, string> } = (await import(caminhoConfig)).default;
    const doDiretorio = listarMigrationsDoDiretorio(DIRETORIO_REAL);
    const embutida = lerMigrationsEsperadas(nextConfig.env?.MIGRATIONS_ESPERADAS);

    expect(doDiretorio.length).toBeGreaterThan(0);
    expect(doDiretorio).toContain("20260916210000_add_galeria_fotos_item_os");
    expect(embutida).toEqual(doDiretorio);
  });
});

describe("lerMigrationsEsperadas", () => {
  it("interpreta a lista JSON", () => {
    expect(lerMigrationsEsperadas('["a","b"]')).toEqual(["a", "b"]);
  });

  it("falha sem valor ou com formato inválido", () => {
    expect(() => lerMigrationsEsperadas(undefined)).toThrow("indisponível");
    expect(() => lerMigrationsEsperadas("")).toThrow("indisponível");
    expect(() => lerMigrationsEsperadas('{"a":1}')).toThrow("inválida");
    expect(() => lerMigrationsEsperadas("[1]")).toThrow("inválida");
    expect(() => lerMigrationsEsperadas("não é json")).toThrow();
  });
});

describe("calcularMigrationsPendentes", () => {
  it("devolve as ausentes na ordem do código", () => {
    expect(calcularMigrationsPendentes(["a", "b", "c"], ["c", "a", "extra"])).toEqual(["b"]);
  });

  it("vazio quando tudo está aplicado", () => {
    expect(calcularMigrationsPendentes(["a"], ["a"])).toEqual([]);
  });
});

describe("buscarMigrationsAplicadas (banco de testes)", () => {
  const REVERTIDA = "99990101000000_teste_224_revertida";
  const INACABADA = "99990101000001_teste_224_inacabada";

  afterEach(async () => {
    await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations" WHERE migration_name IN (${REVERTIDA}, ${INACABADA})
    `;
  });

  it("inclui as migrations do repositório aplicadas no banco de testes", async () => {
    const aplicadas = await buscarMigrationsAplicadas(prisma);

    expect(calcularMigrationsPendentes(listarMigrationsDoDiretorio(DIRETORIO_REAL), aplicadas)).toEqual([]);
  });

  it("não conta migration revertida nem inacabada como aplicada", async () => {
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, rolled_back_at, started_at, applied_steps_count)
      VALUES
        ('teste-224-revertida', 'teste', now(), ${REVERTIDA}, now(), now(), 1),
        ('teste-224-inacabada', 'teste', NULL, ${INACABADA}, NULL, now(), 0)
    `;

    const aplicadas = await buscarMigrationsAplicadas(prisma);

    expect(aplicadas).not.toContain(REVERTIDA);
    expect(aplicadas).not.toContain(INACABADA);
    expect(calcularMigrationsPendentes([REVERTIDA, INACABADA], aplicadas)).toEqual([REVERTIDA, INACABADA]);
  });
});
