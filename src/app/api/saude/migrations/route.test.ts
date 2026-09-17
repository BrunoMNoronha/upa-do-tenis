import path from "node:path";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sessao = vi.hoisted(() => ({ usuario: null as null | { id: string } }));

vi.mock("@/lib/auth-server", () => ({
  obterUsuarioSessaoDaRequest: vi.fn(async () => sessao.usuario),
}));

import { listarMigrationsDoDiretorio } from "@/lib/migrations-esperadas.mjs";
import { prisma } from "@/lib/prisma";

import { GET } from "./route";

const REAIS = listarMigrationsDoDiretorio(path.join(process.cwd(), "prisma", "migrations"));
const FICTICIA = "99990101000000_teste_224_ausente_no_banco";

function requisicao() {
  return new NextRequest("http://localhost/api/saude/migrations");
}

describe("GET /api/saude/migrations", () => {
  const valorOriginal = process.env.MIGRATIONS_ESPERADAS;

  beforeEach(() => {
    sessao.usuario = null;
  });

  afterEach(() => {
    if (valorOriginal === undefined) delete process.env.MIGRATIONS_ESPERADAS;
    else process.env.MIGRATIONS_ESPERADAS = valorOriginal;
    vi.restoreAllMocks();
  });

  it("200 quando o banco tem todas as migrations do código", async () => {
    process.env.MIGRATIONS_ESPERADAS = JSON.stringify(REAIS);

    const res = await GET(requisicao());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("503 só com a contagem, sem sessão", async () => {
    process.env.MIGRATIONS_ESPERADAS = JSON.stringify([...REAIS, FICTICIA]);

    const res = await GET(requisicao());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, pendentes: 1 });
  });

  it("503 com os nomes quando há sessão válida", async () => {
    process.env.MIGRATIONS_ESPERADAS = JSON.stringify([...REAIS, FICTICIA]);
    sessao.usuario = { id: "usr-1" };

    const res = await GET(requisicao());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, pendentes: 1, nomes: [FICTICIA] });
  });

  it("503 sem detalhes quando o banco falha", async () => {
    process.env.MIGRATIONS_ESPERADAS = JSON.stringify(REAIS);
    vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("connection refused at db.interno:5432"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(requisicao());
    const corpo = await res.text();

    expect(res.status).toBe(503);
    expect(JSON.parse(corpo)).toEqual({ ok: false });
    expect(corpo).not.toContain("db.interno");
  });

  it("503 quando a lista esperada não foi embutida no build", async () => {
    delete process.env.MIGRATIONS_ESPERADAS;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(requisicao());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });
});
