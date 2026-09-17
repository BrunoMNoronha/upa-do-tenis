import { NextResponse, type NextRequest } from "next/server";

import { obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import {
  buscarMigrationsAplicadas,
  calcularMigrationsPendentes,
  lerMigrationsEsperadas,
} from "@/lib/migrations-pendentes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };

/**
 * Saúde do schema: indica se o banco tem todas as migrations do código.
 * Rota pública para o smoke test pós-promoção; sem sessão devolve apenas
 * `ok` e a contagem. Os nomes das pendentes só aparecem com sessão válida.
 */
export async function GET(req: NextRequest) {
  let pendentes: string[];

  try {
    const esperadas = lerMigrationsEsperadas();
    const aplicadas = await buscarMigrationsAplicadas(prisma);
    pendentes = calcularMigrationsPendentes(esperadas, aplicadas);
  } catch (error) {
    console.error("Falha ao verificar migrations pendentes:", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: SEM_CACHE });
  }

  if (pendentes.length === 0) {
    return NextResponse.json({ ok: true }, { status: 200, headers: SEM_CACHE });
  }

  const corpo: { ok: false; pendentes: number; nomes?: string[] } = {
    ok: false,
    pendentes: pendentes.length,
  };

  try {
    if (await obterUsuarioSessaoDaRequest(req)) {
      corpo.nomes = pendentes;
    }
  } catch {
    // Falha ao resolver a sessão não pode mascarar o 503: segue sem os nomes.
  }

  return NextResponse.json(corpo, { status: 503, headers: SEM_CACHE });
}
