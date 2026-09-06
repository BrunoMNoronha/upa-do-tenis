import { describe, it, expect, vi, beforeEach } from "vitest";
import { listarClientes, criarCliente } from "./clientes";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("listarClientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const clienteOrderBy = [{ criadoEm: "desc" as const }, { nome: "asc" as const }];

  it("deve buscar clientes sem filtros quando search não for passado", async () => {
    vi.mocked(prisma.cliente.findMany).mockResolvedValue([]);

    await listarClientes();

    expect(prisma.cliente.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: clienteOrderBy,
    });
  });

  it("deve buscar clientes com filtro de nome e telefone quando search contiver números", async () => {
    vi.mocked(prisma.cliente.findMany).mockResolvedValue([]);

    await listarClientes("João 123");

    expect(prisma.cliente.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { nome: { contains: "João 123" } },
          { telefone: { contains: "123" } },
        ],
      },
      orderBy: clienteOrderBy,
    });
  });

  it("deve buscar clientes apenas com filtro de nome quando search não contiver números", async () => {
    vi.mocked(prisma.cliente.findMany).mockResolvedValue([]);

    await listarClientes("João");

    expect(prisma.cliente.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { nome: { contains: "João" } },
        ],
      },
      orderBy: clienteOrderBy,
    });
  });

  it("deve propagar erro do banco de dados", async () => {
    vi.mocked(prisma.cliente.findMany).mockRejectedValue(new Error("Erro de conexão"));

    await expect(listarClientes()).rejects.toThrow("Erro de conexão");
  });
});

describe("criarCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar cliente com dados válidos e sanitizados", async () => {
    const input = {
      nome: " João Silva ",
      telefone: "(11) 99999-9999",
      email: " JOAO@TESTE.COM ",
      cpfCnpj: " 123.456.789-10 ",
    };

    const mockResponse = { id: "1", ...input, criadoEm: new Date(), atualizadoEm: new Date() };
    vi.mocked(prisma.cliente.create).mockResolvedValue(mockResponse as any);

    await criarCliente(input);

    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: {
        nome: "João Silva",
        telefone: "11999999999",
        email: "joao@teste.com",
        cpfCnpj: "12345678910",
      },
    });
  });

  it("deve rejeitar se os dados forem inválidos (falha de validação)", async () => {
    const input = {
      nome: "",
      telefone: "123", // Inválido
    };

    await expect(criarCliente(input as any)).rejects.toThrow();
    expect(prisma.cliente.create).not.toHaveBeenCalled();
  });
});
