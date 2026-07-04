import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "./passwords";
import { autenticarUsuario, buscarUsuarioSessao } from "./auth-service";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    usuario: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const usuarioAtivo = {
  id: "usr-1",
  nome: "Bruno",
  email: "bruno@exemplo.com",
  senhaHash: hashPassword("senha-correta"),
  ativo: true,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("autenticarUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("autentica usuário ativo com senha correta", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuarioAtivo);

    const resultado = await autenticarUsuario("bruno@exemplo.com", "senha-correta");

    expect(resultado.status).toBe("ok");

    if (resultado.status === "ok") {
      expect(resultado.usuario.id).toBe("usr-1");
      expect(resultado.usuario).not.toHaveProperty("senhaHash");
    }
  });

  it("normaliza o e-mail antes de buscar", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuarioAtivo);

    await autenticarUsuario("  Bruno@Exemplo.com ", "senha-correta");

    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: "bruno@exemplo.com" },
    });
  });

  it("rejeita senha incorreta", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuarioAtivo);

    const resultado = await autenticarUsuario("bruno@exemplo.com", "senha-errada");

    expect(resultado.status).toBe("credenciais_invalidas");
  });

  it("rejeita usuário inexistente com o mesmo resultado de senha incorreta", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(null);

    const resultado = await autenticarUsuario("ninguem@exemplo.com", "qualquer");

    expect(resultado.status).toBe("credenciais_invalidas");
  });

  it("rejeita usuário inativo mesmo com senha correta", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ ...usuarioAtivo, ativo: false });

    const resultado = await autenticarUsuario("bruno@exemplo.com", "senha-correta");

    expect(resultado.status).toBe("usuario_inativo");
  });

  it("não revela inatividade quando a senha está incorreta", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ ...usuarioAtivo, ativo: false });

    const resultado = await autenticarUsuario("bruno@exemplo.com", "senha-errada");

    expect(resultado.status).toBe("credenciais_invalidas");
  });
});

describe("buscarUsuarioSessao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna usuário ativo", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      id: "usr-1",
      nome: "Bruno",
      email: "bruno@exemplo.com",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });

    const usuario = await buscarUsuarioSessao("usr-1");

    expect(usuario?.id).toBe("usr-1");
  });

  it("retorna null para usuário inativo (sessão revogada ao inativar)", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      id: "usr-1",
      nome: "Bruno",
      email: "bruno@exemplo.com",
      ativo: false,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });

    expect(await buscarUsuarioSessao("usr-1")).toBeNull();
  });

  it("retorna null para usuário inexistente", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(null);

    expect(await buscarUsuarioSessao("usr-x")).toBeNull();
  });
});
