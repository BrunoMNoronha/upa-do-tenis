import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("deve limpar o cookie de sessão com maxAge 0 e atributos de segurança", async () => {
    const res = await POST();

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ message: "Sessão encerrada." });

    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain("upa_sessao=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("SameSite=strict");
  });
});
