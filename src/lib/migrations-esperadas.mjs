// Módulo em JavaScript puro: é importado pelo next.config.mjs e pelo script
// de aviso local, que rodam sem transpilar TypeScript.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Lista, em ordem, os nomes das migrations versionadas: subpastas de
 * `diretorio` que contêm `migration.sql` (mesmo critério do Prisma Migrate).
 * Não acessa o banco.
 *
 * @param {string} diretorio
 * @returns {string[]}
 */
export function listarMigrationsDoDiretorio(diretorio) {
  return readdirSync(diretorio, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .filter((nome) => existsSync(path.join(diretorio, nome, "migration.sql")))
    .sort();
}
