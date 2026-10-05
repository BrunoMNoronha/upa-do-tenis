import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A suíte usa Node, sem um renderer de DOM. Este harness conserva os estados
// e refs entre renders e executa os callbacks reais do hook. A integração
// com botões, spinner e diálogo também deve ser homologada no navegador.
const harness = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  transicaoPendente: false,
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: harness.refresh }),
}));

vi.mock("react", () => ({
  useState: <T,>(inicial: T | (() => T)) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) {
      harness.slots[slot] = typeof inicial === "function" ? (inicial as () => T)() : inicial;
    }
    const set = (valor: T | ((anterior: T) => T)) => {
      harness.slots[slot] = typeof valor === "function"
        ? (valor as (anterior: T) => T)(harness.slots[slot] as T)
        : valor;
    };
    return [harness.slots[slot] as T, set] as const;
  },
  useRef: <T,>(inicial: T) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = { current: inicial };
    return harness.slots[slot] as { current: T };
  },
  useCallback: <T,>(callback: T) => callback,
  useTransition: () => [harness.transicaoPendente, (callback: () => void) => callback()] as const,
}));

import { useCadastroAcoes } from "./use-cadastro-acoes";

const item = { id: "servico-1", nome: "Serviço de teste", ativo: true };
const outro = { id: "servico-2", nome: "Outro serviço", ativo: true };
const fetchMock = vi.fn<typeof fetch>();

function RenderHarness() {
  harness.cursor = 0;
  return useCadastroAcoes<typeof item>({ endpoint: "/api/servicos", rotulo: "o serviço" });
}

function selecionar() {
  RenderHarness().pedirExclusao(item);
  return RenderHarness();
}

function adiarResposta() {
  let resolver!: (response: Response) => void;
  let rejeitar!: (reason: Error) => void;
  const resposta = new Promise<Response>((resolve, reject) => {
    resolver = resolve;
    rejeitar = reject;
  });
  fetchMock.mockReturnValueOnce(resposta);
  return { resolver, rejeitar };
}

beforeEach(() => {
  harness.slots = [];
  harness.cursor = 0;
  harness.transicaoPendente = false;
  harness.refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("exclusão de cadastros durante a requisição", () => {
  it("mantém o alvo visível e bloqueia reentrada, cancelamento e troca antes da resposta", async () => {
    const adiada = adiarResposta();
    const acoes = selecionar();
    const aoExcluir = vi.fn();
    const primeira = acoes.confirmarExclusao(aoExcluir);
    // Mesmo callback anterior ao re-render: setState sozinho não bloqueia.
    await acoes.confirmarExclusao(aoExcluir);
    acoes.cancelarExclusao();
    acoes.pedirExclusao(outro);

    const pendente = RenderHarness();
    expect(pendente.isExcluindo).toBe(true);
    expect(pendente.isPending).toBe(true);
    expect(pendente.itemParaExcluir).toEqual(item);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/servicos/servico-1", { method: "DELETE" });
    expect(aoExcluir).not.toHaveBeenCalled();
    expect(harness.refresh).not.toHaveBeenCalled();

    adiada.resolver(new Response(null, { status: 204 }));
    await primeira;
    expect(aoExcluir).toHaveBeenCalledExactlyOnceWith(item);
    expect(harness.refresh).toHaveBeenCalledTimes(1);
    expect(RenderHarness().itemParaExcluir).toBeNull();
    expect(RenderHarness().isExcluindo).toBe(false);
    expect(RenderHarness().isPending).toBe(false);
  });

  it("409 preserva a mensagem de vínculo, fecha após a resposta e permite nova tentativa", async () => {
    const adiada = adiarResposta();
    const aoExcluir = vi.fn();
    const operacao = selecionar().confirmarExclusao(aoExcluir);
    expect(RenderHarness().itemParaExcluir).toEqual(item);
    const mensagem = "Este serviço possui ordens de serviço vinculadas.";
    adiada.resolver(Response.json({ message: mensagem }, { status: 409 }));
    await operacao;

    expect(RenderHarness().listaError).toBe(mensagem);
    expect(RenderHarness().itemParaExcluir).toBeNull();
    expect(RenderHarness().isPending).toBe(false);
    expect(aoExcluir).not.toHaveBeenCalled();
    expect(harness.refresh).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    RenderHarness().pedirExclusao(outro);
    expect(RenderHarness().listaError).toBeNull();
    await RenderHarness().confirmarExclusao(aoExcluir);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(aoExcluir).toHaveBeenCalledExactlyOnceWith(outro);
    expect(harness.refresh).toHaveBeenCalledTimes(1);
  });

  it("rejeição de rede mostra erro amigável e libera o bloqueio para tentar novamente", async () => {
    const adiada = adiarResposta();
    const aoExcluir = vi.fn();
    const operacao = selecionar().confirmarExclusao(aoExcluir);
    adiada.rejeitar(new Error("Failed to fetch"));
    await expect(operacao).resolves.toBeUndefined();

    expect(RenderHarness().listaError).toBe("Não foi possível excluir o serviço. Tente novamente.");
    expect(RenderHarness().itemParaExcluir).toBeNull();
    expect(RenderHarness().isExcluindo).toBe(false);
    expect(RenderHarness().isPending).toBe(false);
    expect(aoExcluir).not.toHaveBeenCalled();
    expect(harness.refresh).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await selecionar().confirmarExclusao(aoExcluir);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(aoExcluir).toHaveBeenCalledExactlyOnceWith(item);
  });

  it("conserva o bloqueio da transição de atualização depois que a rede terminou", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await selecionar().confirmarExclusao();
    harness.transicaoPendente = true;
    expect(RenderHarness().isExcluindo).toBe(false);
    expect(RenderHarness().isPending).toBe(true);
  });

  it("não envia DELETE sem um alvo escolhido", async () => {
    await RenderHarness().confirmarExclusao();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(RenderHarness().isPending).toBe(false);
  });
});
