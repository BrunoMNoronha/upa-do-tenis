import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyPassword } from "./passwords";
import { criarPrimeiroAdmin } from "./bootstrap-admin";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    usuario: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const entradaValida = {
  nome: "Bruno Admin",
  email: "admin@exemplo.com",
  senha: "senha-segura",
};

describe("criarPrimeiroAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.usuario.create.mockImplementation(async ({ data, select }) => {
      const registro = {
        id: "usr-1",
        nome: data.nome,
        email: data.email,
        senhaHash: data.senhaHash,
        ativo: data.ativo,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      return Object.fromEntries(
        Object.keys(select).map((campo) => [campo, registro[campo as keyof typeof registro]])
      );
    });
  });

  it("cria o primeiro admin quando o banco está vazio", async () => {
    prismaMock.usuario.count.mockResolvedValueOnce(0);

    const resultado = await criarPrimeiroAdmin(entradaValida);

    expect(resultado.status).toBe("criado");

    if (resultado.status === "criado") {
      expect(resultado.usuario.nome).toBe("Bruno Admin");
      expect(resultado.usuario.email).toBe("admin@exemplo.com");
      expect(resultado.usuario.ativo).toBe(true);
    }
  });

  it("normaliza nome e e-mail antes de salvar", async () => {
    prismaMock.usuario.count.mockResolvedValueOnce(0);

    await criarPrimeiroAdmin({
      nome: "  Bruno Admin  ",
      email: "Admin@Exemplo.com",
      senha: "senha-segura",
    });

    const chamada = prismaMock.usuario.create.mock.calls[0][0];
    expect(chamada.data.nome).toBe("Bruno Admin");
    expect(chamada.data.email).toBe("admin@exemplo.com");
  });

  it("salva a senha com hash verificável, nunca em texto puro", async () => {
    prismaMock.usuario.count.mockResolvedValueOnce(0);

    await criarPrimeiroAdmin(entradaValida);

    const chamada = prismaMock.usuario.create.mock.calls[0][0];
    expect(chamada.data.senhaHash).not.toContain("senha-segura");
    expect(chamada.data.senhaHash).toMatch(/^scrypt:/);
    expect(verifyPassword("senha-segura", chamada.data.senhaHash)).toBe(true);
  });

  it("não expõe senhaHash nem senha no resultado", async () => {
    prismaMock.usuario.count.mockResolvedValueOnce(0);

    const resultado = await criarPrimeiroAdmin(entradaValida);

    expect(resultado.status).toBe("criado");

    if (resultado.status === "criado") {
      expect(resultado.usuario).not.toHaveProperty("senhaHash");
      expect(resultado.usuario).not.toHaveProperty("senha");
      expect(JSON.stringify(resultado)).not.toContain("senha-segura");
    }
  });

  it("bloqueia quando já existe usuário cadastrado", async () => {
    prismaMock.usuario.count.mockResolvedValueOnce(1);

    const resultado = await criarPrimeiroAdmin(entradaValida);

    expect(resultado).toEqual({ status: "bloqueado", totalUsuarios: 1 });
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it("rejeita e-mail inválido sem consultar o banco", async () => {
    const resultado = await criarPrimeiroAdmin({
      ...entradaValida,
      email: "nao-e-email",
    });

    expect(resultado.status).toBe("dados_invalidos");

    if (resultado.status === "dados_invalidos") {
      expect(resultado.erros).toContain("Informe um e-mail válido.");
    }

    expect(prismaMock.usuario.count).not.toHaveBeenCalled();
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it("rejeita senha curta sem consultar o banco", async () => {
    const resultado = await criarPrimeiroAdmin({
      ...entradaValida,
      senha: "12345",
    });

    expect(resultado.status).toBe("dados_invalidos");

    if (resultado.status === "dados_invalidos") {
      expect(resultado.erros).toContain("A senha deve ter pelo menos 6 caracteres.");
    }

    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it("rejeita nome muito curto", async () => {
    const resultado = await criarPrimeiroAdmin({
      ...entradaValida,
      nome: "A",
    });

    expect(resultado.status).toBe("dados_invalidos");
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });
});
