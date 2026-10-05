import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: { configuracaoSistema: { findUnique } } }));

import { obterDadosEmpresa, obterDadosEmpresaPersistidos } from "./configuracoes";
import { DADOS_EMPRESA_PADRAO } from "./dados-empresa";

const salvo = { ...DADOS_EMPRESA_PADRAO, endereco: { ...DADOS_EMPRESA_PADRAO.endereco }, whatsapp: "11987654321" };

describe("obterDadosEmpresaPersistidos (destino do catálogo, sem fallback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("devolve os dados salvos e válidos", async () => {
    findUnique.mockResolvedValue({ valor: JSON.stringify(salvo) });

    expect((await obterDadosEmpresaPersistidos())?.whatsapp).toBe("11987654321");
  });

  it("sem configuração salva devolve null, enquanto obterDadosEmpresa usaria o fallback", async () => {
    findUnique.mockResolvedValue(null);

    expect(await obterDadosEmpresaPersistidos()).toBeNull();
    expect((await obterDadosEmpresa()).whatsapp).toBe(DADOS_EMPRESA_PADRAO.whatsapp);
  });

  it.each(["{", JSON.stringify({ versao: 2 }), JSON.stringify({ ...salvo, whatsapp: "123" })])("configuração inválida %s devolve null", async (valor) => {
    findUnique.mockResolvedValue({ valor });

    expect(await obterDadosEmpresaPersistidos()).toBeNull();
  });

  it("falha de leitura devolve null sem lançar", async () => {
    findUnique.mockRejectedValue(new Error("banco fora"));

    expect(await obterDadosEmpresaPersistidos()).toBeNull();
  });
});
