import { describe, expect, it } from "vitest";

import { criarTokenSessao } from "@/lib/auth-session";
import { verificarTokenSessaoEdge } from "@/lib/auth-edge";

describe("verificarTokenSessaoEdge", () => {
  it("aceita token criado pelo assinador Node (mesmo segredo)", async () => {
    const token = criarTokenSessao("usr-1");

    const payload = await verificarTokenSessaoEdge(token);

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("usr-1");
  });

  it("rejeita token com payload adulterado", async () => {
    const token = criarTokenSessao("usr-1");
    const [, assinatura] = token.split(".");
    const payloadFalso = Buffer.from(
      JSON.stringify({ sub: "usr-2", exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString("base64url");

    const payload = await verificarTokenSessaoEdge(`${payloadFalso}.${assinatura}`);

    expect(payload).toBeNull();
  });

  it("rejeita token expirado", async () => {
    const oitoHorasEmMs = 8 * 60 * 60 * 1000;
    const token = criarTokenSessao("usr-1", Date.now() - oitoHorasEmMs - 1000);

    const payload = await verificarTokenSessaoEdge(token);

    expect(payload).toBeNull();
  });

  it("rejeita tokens malformados", async () => {
    expect(await verificarTokenSessaoEdge("")).toBeNull();
    expect(await verificarTokenSessaoEdge("sem-ponto")).toBeNull();
    expect(await verificarTokenSessaoEdge("a.b.c")).toBeNull();
    expect(await verificarTokenSessaoEdge("%%%.%%%")).toBeNull();
  });
});
