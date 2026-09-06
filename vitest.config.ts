import { defineConfig } from "vitest/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";

const testEnvPath = path.resolve(process.cwd(), ".env.test");

/**
 * Lê pares chave=valor de um arquivo .env, sem depender de precedência.
 *
 * `loadEnvFile` (como `node --env-file`) NÃO sobrescreve variáveis já
 * presentes em `process.env`. A suíte é destrutiva — faz `deleteMany()` em
 * vendas, caixa, estoque e insumos —, então uma `DATABASE_URL` herdada do
 * shell apontaria os testes para desenvolvimento ou produção. O valor do
 * `.env.test` precisa vencer explicitamente.
 */
function lerVariaveis(arquivo: string): Record<string, string> {
  const variaveis: Record<string, string> = {};

  for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const par = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(linha);
    if (!par) continue;

    let valor = par[2].trim();
    const aspas = valor[0];
    if ((aspas === '"' || aspas === "'") && valor.endsWith(aspas) && valor.length > 1) {
      valor = valor.slice(1, -1);
    }

    variaveis[par[1]] = valor;
  }

  return variaveis;
}

if (existsSync(testEnvPath)) {
  loadEnvFile(testEnvPath);

  const doArquivo = lerVariaveis(testEnvPath);
  if (doArquivo.DATABASE_URL) {
    process.env.DATABASE_URL = doArquivo.DATABASE_URL;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não definida para os testes. Crie um .env.test apontando para o banco de testes " +
      "(ver .env.test.example) ou defina DATABASE_URL no ambiente. Nunca aponte para o banco de produção: " +
      "a suíte apaga registros de vendas, caixa, estoque e insumos.",
  );
}

export default defineConfig({
  // Transforma TSX somente nos testes; o Next mantém jsx: preserve.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
  },
});
