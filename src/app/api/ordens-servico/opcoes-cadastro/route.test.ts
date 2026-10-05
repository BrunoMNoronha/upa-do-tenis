import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: vi.fn() }));
vi.mock("@/lib/dados-cache", () => ({ listarOpcoesCadastroOSComCache: vi.fn() }));

import { exigirSessaoApi } from "@/lib/auth-server";
import { listarOpcoesCadastroOSComCache } from "@/lib/dados-cache";
import { GET } from "./route";

describe("GET opções do cadastro de OS", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia acesso sem sessão", async () => {
    vi.mocked(exigirSessaoApi).mockResolvedValue(NextResponse.json({ message: "Não autenticado." }, { status: 401 }));
    const resposta = await GET(new NextRequest("http://localhost/api/ordens-servico/opcoes-cadastro"));
    expect(resposta.status).toBe(401);
    expect(listarOpcoesCadastroOSComCache).not.toHaveBeenCalled();
  });

  it("retorna opções mínimas autenticadas sem cache HTTP", async () => {
    vi.mocked(exigirSessaoApi).mockResolvedValue(null);
    vi.mocked(listarOpcoesCadastroOSComCache).mockResolvedValue({
      clientes: [{ id: "c1", nome: "Maria", telefone: "61999999999" }],
      servicos: [{ id: "s1", nome: "Reparo", precoBase: "100.10" }],
    });
    const resposta = await GET(new NextRequest("http://localhost/api/ordens-servico/opcoes-cadastro"));
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await resposta.json()).toEqual({
      clientes: [{ id: "c1", nome: "Maria", telefone: "61999999999" }],
      servicos: [{ id: "s1", nome: "Reparo", precoBase: "100.10" }],
    });
  });
});
