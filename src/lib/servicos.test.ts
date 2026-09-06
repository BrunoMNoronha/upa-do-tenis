import { describe, it, expect, vi, beforeEach } from "vitest";
import { listarServicos } from "./servicos";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    servico: {
      findMany: vi.fn(),
    },
  },
}));

describe("listarServicos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve chamar prisma.servico.findMany com filtro de ativo=true e ordenação por nome ascendente", async () => {
    const mockServicos = [
      { id: "1", nome: "Limpeza Premium", ativo: true, preco: 50 },
      { id: "2", nome: "Pintura", ativo: true, preco: 80 },
    ];
    vi.mocked(prisma.servico.findMany).mockResolvedValue(mockServicos as any);

    const resultado = await listarServicos();

    expect(prisma.servico.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.servico.findMany).toHaveBeenCalledWith({
      where: { ativo: true },
      orderBy: {
        nome: "asc",
      },
    });
    expect(resultado).toEqual(mockServicos);
  });

  it("deve retornar array vazio quando nenhum serviço ativo for encontrado", async () => {
    vi.mocked(prisma.servico.findMany).mockResolvedValue([]);

    const resultado = await listarServicos();

    expect(prisma.servico.findMany).toHaveBeenCalledWith({
      where: { ativo: true },
      orderBy: {
        nome: "asc",
      },
    });
    expect(resultado).toEqual([]);
  });

  it("deve propagar erro se a consulta do banco falhar", async () => {
    const erroBanco = new Error("Erro de conexão com o banco");
    vi.mocked(prisma.servico.findMany).mockRejectedValue(erroBanco);

    await expect(listarServicos()).rejects.toThrow("Erro de conexão com o banco");
  });
});
