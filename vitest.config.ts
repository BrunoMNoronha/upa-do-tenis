import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";

const testEnvPath = path.resolve(process.cwd(), ".env.test");

if (existsSync(testEnvPath)) {
  loadEnvFile(testEnvPath);
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
