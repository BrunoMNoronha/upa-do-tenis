import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

const env = loadEnv("test", process.cwd(), "");
process.env.DATABASE_URL = env.DATABASE_URL;

export default defineConfig({
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
