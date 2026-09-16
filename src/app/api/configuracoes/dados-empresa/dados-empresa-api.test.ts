import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { configuracaoSistema: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

import { exigirSessaoApi } from "@/lib/auth-server";
import { DADOS_EMPRESA_PADRAO } from "@/lib/dados-empresa";
import { prisma } from "@/lib/prisma";
import { GET, PUT } from "./route";

function requisicao(method: "GET" | "PUT", body?: unknown) {
  return new NextRequest("http://localhost/api/configuracoes/dados-empresa", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("/api/configuracoes/dados-empresa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exigirSessaoApi).mockResolvedValue(null as never);
  });

  it("exige autenticação no GET e no PUT", async () => {
    vi.mocked(exigirSessaoApi).mockResolvedValue(new Response(null, { status: 401 }) as never);
    expect((await GET(requisicao("GET"))).status).toBe(401);
    expect((await PUT(requisicao("PUT", DADOS_EMPRESA_PADRAO))).status).toBe(401);
  });

  it("retorna a carga inicial quando a chave não existe", async () => {
    vi.mocked(prisma.configuracaoSistema.findUnique).mockResolvedValue(null);
    const resposta = await GET(requisicao("GET"));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual(DADOS_EMPRESA_PADRAO);
  });

  it("usa fallback quando o JSON salvo está malformado ou inválido", async () => {
    for (const valor of ["{", JSON.stringify({ versao: 1, nomeFantasia: "" })]) {
      vi.mocked(prisma.configuracaoSistema.findUnique).mockResolvedValue({ valor } as never);
      const resposta = await GET(requisicao("GET"));
      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual(DADOS_EMPRESA_PADRAO);
    }
  });

  it("normaliza e persiste somente a chave dadosEmpresa", async () => {
    vi.mocked(prisma.configuracaoSistema.upsert).mockResolvedValue({} as never);
    const entrada = {
      ...DADOS_EMPRESA_PADRAO,
      telefone: "(61) 3562-8447",
      endereco: { ...DADOS_EMPRESA_PADRAO.endereco, uf: "df", cep: "72010-120" },
    };
    const resposta = await PUT(requisicao("PUT", entrada));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ telefone: "6135628447", endereco: { uf: "DF", cep: "72010120" } });
    const chamada = vi.mocked(prisma.configuracaoSistema.upsert).mock.calls[0][0];
    expect(chamada.where).toEqual({ chave: "dadosEmpresa" });
    expect(chamada.create.chave).toBe("dadosEmpresa");
    expect(JSON.parse(chamada.create.valor)).toMatchObject({ telefone: "6135628447" });
  });

  it("rejeita campos extras e preserva o valor anterior", async () => {
    const resposta = await PUT(requisicao("PUT", { ...DADOS_EMPRESA_PADRAO, intruso: true }));
    expect(resposta.status).toBe(400);
    expect(prisma.configuracaoSistema.upsert).not.toHaveBeenCalled();
  });

  it("não produz falso sucesso quando a persistência falha", async () => {
    vi.mocked(prisma.configuracaoSistema.upsert).mockRejectedValue(new Error("indisponível"));
    expect((await PUT(requisicao("PUT", DADOS_EMPRESA_PADRAO))).status).toBe(500);
  });
});
