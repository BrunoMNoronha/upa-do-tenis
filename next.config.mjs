import path from "node:path";

import { listarMigrationsDoDiretorio } from "./src/lib/migrations-esperadas.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Migrations versionadas, resolvidas no build (sem banco) e embutidas no
  // bundle para /api/saude/migrations. Ver issue #224.
  env: {
    MIGRATIONS_ESPERADAS: JSON.stringify(
      listarMigrationsDoDiretorio(path.join(process.cwd(), "prisma", "migrations"))
    ),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
