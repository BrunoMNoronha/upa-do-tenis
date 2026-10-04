import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { exigirSessaoApiMock, obterUsuarioMock } = vi.hoisted(() => ({
  exigirSessaoApiMock: vi.fn(),
  obterUsuarioMock: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: exigirSessaoApiMock,
  obterUsuarioSessaoDaRequest: obterUsuarioMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, {
    get() { throw new Error("Acesso ao banco após a sessão perder validade."); },
  }),
}));

import { POST } from "@/app/api/ordens-servico/route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/ordens-servico: validade da sessão", () => {
  it("interrompe a requisição quando o guard rejeita a sessão", async () => {
    exigirSessaoApiMock.mockResolvedValue(
      NextResponse.json({ message: "Não autenticado." }, { status: 401 }),
    );
    const request = new NextRequest("http://localhost/api/ordens-servico", { method: "POST" });
    const lerBody = vi.spyOn(request, "json");

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(obterUsuarioMock).not.toHaveBeenCalled();
    expect(lerBody).not.toHaveBeenCalled();
  });

  it("retorna 401 se o usuário for inativado ou removido entre as consultas", async () => {
    exigirSessaoApiMock.mockResolvedValue(null);
    obterUsuarioMock.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/ordens-servico", { method: "POST" });
    const lerBody = vi.spyOn(request, "json");

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Não autenticado." });
    expect(lerBody).not.toHaveBeenCalled();
  });
});
