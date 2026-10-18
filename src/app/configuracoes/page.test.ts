import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DADOS_EMPRESA_PADRAO } from "@/lib/dados-empresa";

vi.mock("@/lib/auth-server", () => ({ exigirSessao: vi.fn() }));
vi.mock("@/lib/dados-cache", () => ({
  obterDadosEmpresaComCache: vi.fn(),
  obterLinkAvaliacaoGoogleComCache: vi.fn(),
}));
vi.mock("@/components/app-shell", () => ({ AppShell: () => null }));
vi.mock("./dados-empresa-form", () => ({ DadosEmpresaForm: () => null }));
vi.mock("./configuracoes-client", () => ({ ConfiguracoesClient: () => null }));
vi.mock("./configuracao-claude-client", () => ({ ConfiguracaoClaudeClient: () => null }));
vi.mock("@/lib/insights-config", () => ({ obterStatusChaveClaude: vi.fn() }));

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache, obterLinkAvaliacaoGoogleComCache } from "@/lib/dados-cache";
import { obterStatusChaveClaude } from "@/lib/insights-config";
import ConfiguracoesPage from "./page";

describe("página de configurações", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(exigirSessao).mockResolvedValue({
      id: "usuario",
      nome: "Operador",
      email: "operador@example.com",
      ativo: true,
    });
  });

  it("entrega a identificação persistida ao shell e aos formulários", async () => {
    const dadosEmpresa = { ...DADOS_EMPRESA_PADRAO, nomeFantasia: "Oficina Atualizada" };
    const link = "https://example.com/avaliacao";
    vi.mocked(obterDadosEmpresaComCache).mockResolvedValue(dadosEmpresa);
    vi.mocked(obterLinkAvaliacaoGoogleComCache).mockResolvedValue(link);
    vi.mocked(obterStatusChaveClaude).mockResolvedValue({ configurada: true, ultimosQuatro: "wxyz" });

    const pagina = await ConfiguracoesPage();
    const conteudo = pagina.props.children as ReactElement;
    const [empresa, avaliacao, claude] = conteudo.props.children as ReactElement[];

    expect(pagina.props.dadosEmpresa).toEqual(dadosEmpresa);
    expect(empresa.props.dadosIniciais).toEqual(dadosEmpresa);
    expect(avaliacao.props).toMatchObject({ linkInicial: link, nomeEmpresa: dadosEmpresa.nomeFantasia });
    expect(claude.props).toEqual({ statusInicial: { configurada: true, ultimosQuatro: "wxyz" } });
  });

  it("não lê os dados cacheados quando a sessão é recusada", async () => {
    vi.mocked(exigirSessao).mockRejectedValue(new Error("Sessão recusada"));

    await expect(ConfiguracoesPage()).rejects.toThrow("Sessão recusada");

    expect(obterDadosEmpresaComCache).not.toHaveBeenCalled();
    expect(obterLinkAvaliacaoGoogleComCache).not.toHaveBeenCalled();
    expect(obterStatusChaveClaude).not.toHaveBeenCalled();
  });
});
