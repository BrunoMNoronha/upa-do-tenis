import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { otimizarMock } = vi.hoisted(() => ({ otimizarMock: vi.fn() }));

// Mantém classes e validações reais; só a decodificação/canvas (indisponível
// em Node) é substituída, para provar que o fluxo chama o pipeline existente.
vi.mock("@/lib/imagem-otimizacao", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/imagem-otimizacao")>()),
  otimizarImagem: otimizarMock,
}));

import { ImagemOtimizacaoError } from "@/lib/imagem-otimizacao";
import {
  buscarOrdensParaFoto,
  carregarOrdemParaFoto,
  criarEnviadorFotoOS,
  montarUrlBuscaOrdensFoto,
  ordemAceitaFoto,
  priorizarNumeroExato,
  type OrdemParaFoto,
} from "@/lib/os-fotos-fluxo";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function ordemApi(id: string, numero: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    numero,
    status: "ABERTA",
    cliente: { nome: "Maria Souza", telefone: "61985307168" },
    itens: [{ id: `${id}-item`, descricao: "Tênis Nike branco", tipoItem: "TENIS" }],
    pagamentos: [],
    ...extra,
  };
}

const original = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb])], "IMG_0001.jpg", { type: "image/jpeg" });
const otimizada = new File([new Uint8Array([0x52, 0x49, 0x46, 0x46])], "foto-recebimento.webp", { type: "image/webp" });

function resultadoOtimizado() {
  return {
    file: otimizada, mimeType: "image/webp", tamanhoOriginal: original.size, tamanhoOtimizado: otimizada.size,
    original: { largura: 4000, altura: 3000 }, final: { largura: 1600, altura: 1200 },
  };
}

describe("busca de OS para foto", () => {
  it("usa a listagem existente com o termo codificado e página curta", () => {
    expect(montarUrlBuscaOrdensFoto(" 0124 ")).toBe("/api/ordens-servico?busca=0124&pageSize=10");
    expect(montarUrlBuscaOrdensFoto("Maria & Filhos")).toBe("/api/ordens-servico?busca=Maria+%26+Filhos&pageSize=10");
  });

  it("retorna as OS mapeadas com número, cliente, item e status", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ data: [ordemApi("os-1", "OS-16092026-0124")], pagination: {} }));

    const ordens = await buscarOrdensParaFoto("0124", fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/ordens-servico?busca=0124&pageSize=10", { cache: "no-store" });
    expect(ordens).toEqual([
      {
        id: "os-1",
        numero: "OS-16092026-0124",
        status: "ABERTA",
        cliente: { nome: "Maria Souza", telefone: "61985307168" },
        itens: [{ id: "os-1-item", descricao: "Tênis Nike branco", tipoItem: "TENIS" }],
      },
    ]);
  });

  it("prioriza o número exato da OS sobre correspondências parciais", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({
      data: [ordemApi("parcial", "OS-01092026-10124"), ordemApi("exata", "OS-16092026-0124")],
    }));

    const ordens = await buscarOrdensParaFoto("0124", fetcher);

    expect(ordens.map((ordem) => ordem.id)).toEqual(["exata", "parcial"]);
  });

  it("não consulta a API com termo vazio", async () => {
    const fetcher = vi.fn();
    await expect(buscarOrdensParaFoto("   ", fetcher)).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("OS inexistente na busca resulta em lista vazia", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ data: [], pagination: { total: 0 } }));
    await expect(buscarOrdensParaFoto("9999", fetcher)).resolves.toEqual([]);
  });

  it("propaga erro da API e falha de rede com mensagem amigável", async () => {
    await expect(buscarOrdensParaFoto("0124", vi.fn().mockResolvedValue(json({ message: "Não autenticado." }, 401))))
      .rejects.toMatchObject({ name: "FluxoFotoError", message: "Não autenticado.", status: 401 });
    await expect(buscarOrdensParaFoto("0124", vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))))
      .rejects.toThrow("Falha de conexão ao buscar ordens de serviço. Tente novamente.");
  });

  it("priorizarNumeroExato mantém a ordem quando não há termo", () => {
    const ordens = [{ numero: "OS-1" }, { numero: "OS-2" }] as OrdemParaFoto[];
    expect(priorizarNumeroExato(ordens, "")).toBe(ordens);
  });
});

describe("seleção da OS", () => {
  it("carrega o detalhe da OS selecionada, incluindo quais itens já têm foto", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({
      ordemServico: ordemApi("os-1", "OS-16092026-0124", {
        itens: [
          { id: "item-a", descricao: "Tênis", tipoItem: "TENIS", possuiFotoRecebimento: true },
          { id: "item-b", descricao: "Bota", tipoItem: "BOTA", possuiFotoRecebimento: false },
        ],
      }),
    }));

    const ordem = await carregarOrdemParaFoto("os-1", fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/ordens-servico/os-1", { cache: "no-store" });
    expect(ordem.id).toBe("os-1");
    expect(ordem.itens).toEqual([
      { id: "item-a", descricao: "Tênis", tipoItem: "TENIS", possuiFotoRecebimento: true },
      { id: "item-b", descricao: "Bota", tipoItem: "BOTA", possuiFotoRecebimento: false },
    ]);
  });

  it("OS inexistente retorna erro 404 claro", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ message: "Ordem de serviço não encontrada." }, 404));
    await expect(carregarOrdemParaFoto("nao-existe", fetcher))
      .rejects.toMatchObject({ message: "Ordem de serviço não encontrada.", status: 404 });
  });

  it("só aceita foto com a OS aberta, como a rota de upload", () => {
    expect(ordemAceitaFoto("ABERTA")).toBe(true);
    for (const status of ["EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE", "CANCELADA"]) {
      expect(ordemAceitaFoto(status)).toBe(false);
    }
  });
});

describe("envio da foto para a OS", () => {
  beforeEach(() => {
    otimizarMock.mockReset();
    otimizarMock.mockResolvedValue(resultadoOtimizado());
  });

  it("otimiza com o pipeline existente e envia o arquivo otimizado à rota do item da OS", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ foto: true }, 201));
    const fases: string[] = [];
    const enviador = criarEnviadorFotoOS({ fetcher });

    const resultado = await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original, onFase: (fase) => fases.push(fase) });

    expect(resultado).toEqual({ ok: true });
    expect(otimizarMock).toHaveBeenCalledTimes(1);
    expect(otimizarMock).toHaveBeenCalledWith(original);
    expect(fases).toEqual(["processando", "enviando"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("/api/ordens-servico/os-1/itens/item-1/foto");
    expect(init.method).toBe("POST");
    const enviado = (init.body as FormData).get("foto") as File;
    expect(enviado).toBe(otimizada);
    expect(enviado).not.toBe(original);
  });

  it("usa o otimizarImagem padrão quando nenhuma dependência é injetada", async () => {
    const enviador = criarEnviadorFotoOS({ fetcher: vi.fn().mockResolvedValue(json({ foto: true }, 201)) });
    await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original });
    expect(otimizarMock).toHaveBeenCalledWith(original);
  });

  it("falha de rede preserva a foto otimizada e o retry reenvia sem reprocessar", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json({ foto: true }, 201));
    const enviador = criarEnviadorFotoOS({ fetcher });

    const falha = await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original });
    expect(falha).toEqual({ ok: false, motivo: "envio", mensagem: expect.stringContaining("tente novamente") });

    const fases: string[] = [];
    const retry = await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original, onFase: (fase) => fases.push(fase) });

    expect(retry).toEqual({ ok: true });
    expect(otimizarMock).toHaveBeenCalledTimes(1);
    expect(fases).toEqual(["enviando"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((fetcher.mock.calls[1][1].body as FormData).get("foto")).toBe(otimizada);
  });

  it("erro do servidor devolve status e mensagem da API", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ message: "A foto só pode ser alterada enquanto a OS estiver aberta." }, 409));
    const resultado = await criarEnviadorFotoOS({ fetcher }).enviar({ ordemId: "os-1", itemId: "item-1", original });
    expect(resultado).toEqual({
      ok: false, motivo: "envio", status: 409, mensagem: "A foto só pode ser alterada enquanto a OS estiver aberta.",
    });
  });

  it("erro 401 da API é tratado como falha de envio sem descartar a foto", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ message: "Não autenticado." }, 401))
      .mockResolvedValueOnce(json({ foto: true }, 201));
    const enviador = criarEnviadorFotoOS({ fetcher });

    expect(await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original }))
      .toEqual({ ok: false, motivo: "envio", status: 401, mensagem: "Não autenticado." });
    expect(await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original })).toEqual({ ok: true });
    expect(otimizarMock).toHaveBeenCalledTimes(1);
  });

  it("falha na otimização não envia nada e pede outra foto", async () => {
    otimizarMock.mockRejectedValueOnce(new ImagemOtimizacaoError("Não foi possível ler a imagem. O arquivo pode estar corrompido."));
    const fetcher = vi.fn();

    const resultado = await criarEnviadorFotoOS({ fetcher }).enviar({ ordemId: "os-1", itemId: "item-1", original });

    expect(resultado).toEqual({ ok: false, motivo: "imagem", mensagem: "Não foi possível ler a imagem. O arquivo pode estar corrompido." });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("impede upload duplicado com cliques simultâneos", async () => {
    let concluir!: (response: Response) => void;
    const fetcher = vi.fn().mockReturnValue(new Promise<Response>((resolve) => { concluir = resolve; }));
    const enviador = criarEnviadorFotoOS({ fetcher });

    const primeiro = enviador.enviar({ ordemId: "os-1", itemId: "item-1", original });
    const segundo = await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original });
    expect(segundo).toEqual({ ok: false, motivo: "em-andamento" });
    expect(enviador.estaEnviando()).toBe(true);

    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    concluir(json({ foto: true }, 201));
    expect(await primeiro).toEqual({ ok: true });
    expect(enviador.estaEnviando()).toBe(false);
    expect(otimizarMock).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("após sucesso, a próxima foto é otimizada novamente (não reutiliza cache)", async () => {
    const fetcher = vi.fn().mockImplementation(async () => json({ foto: true }, 201));
    const enviador = criarEnviadorFotoOS({ fetcher });

    await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original });
    await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original });

    expect(otimizarMock).toHaveBeenCalledTimes(2);
  });

  it("descartar limpa a foto preservada, e uma foto nova é processada", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue(json({ foto: true }, 201));
    const enviador = criarEnviadorFotoOS({ fetcher });
    await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original });

    enviador.descartar();
    await enviador.enviar({ ordemId: "os-1", itemId: "item-1", original });

    expect(otimizarMock).toHaveBeenCalledTimes(2);
  });
});

describe("tela /os/fotos", () => {
  const raiz = path.resolve(__dirname, "../app/os/fotos");
  const pagina = readFileSync(path.join(raiz, "page.tsx"), "utf8");
  const cliente = readFileSync(path.join(raiz, "os-fotos-client.tsx"), "utf8");

  it("exige sessão no servidor", () => {
    expect(pagina).toMatch(/await exigirSessao\(\)/);
  });

  it("usa a captura nativa com câmera traseira e mantém a galeria como alternativa", () => {
    expect(cliente).toMatch(/accept="image\/\*"\s+capture="environment"/);
    expect(cliente.match(/type="file"/g)).toHaveLength(2);
    expect(cliente).not.toMatch(/getUserMedia/);
  });

  it("não cria pipeline de imagem próprio: sem canvas, toBlob ou fetch direto de upload", () => {
    expect(cliente).not.toMatch(/canvas|toBlob|createImageBitmap/);
    expect(cliente).not.toMatch(/\/foto`?["']?,\s*\{\s*method/);
    expect(cliente).toMatch(/criarEnviadorFotoOS\(\)/);
  });
});
