import { ImagemOtimizacaoError, otimizarImagem, type ImagemOtimizada } from "@/lib/imagem-otimizacao";

/**
 * Fluxo mobile de inclusão de fotos em OS (/os/fotos).
 *
 * Não existe pipeline de imagem próprio aqui: a otimização é a mesma
 * `otimizarImagem` usada no cadastro e no detalhe da OS, e o envio usa a rota
 * existente `POST /api/ordens-servico/[id]/itens/[itemId]/foto` (Blob privado,
 * validação de MIME/assinatura/4 MB e vínculo em `fotoRecebimentoPathname`).
 */

export type ItemParaFoto = {
  id: string;
  descricao: string;
  tipoItem: string;
  /** Só é conhecido após carregar o detalhe da OS. */
  possuiFotoRecebimento?: boolean;
};

export type OrdemParaFoto = {
  id: string;
  numero: string;
  status: string;
  cliente: { nome: string; telefone: string };
  itens: ItemParaFoto[];
};

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export class FluxoFotoError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "FluxoFotoError";
    this.status = status;
  }
}

export const TAMANHO_PAGINA_BUSCA_FOTO = 10;

/** A rota de foto só aceita alteração com a OS aberta (409 nos demais status). */
export function ordemAceitaFoto(status: string) {
  return status === "ABERTA";
}

export function montarUrlBuscaOrdensFoto(termo: string) {
  const params = new URLSearchParams({ busca: termo.trim(), pageSize: String(TAMANHO_PAGINA_BUSCA_FOTO) });
  return `/api/ordens-servico?${params.toString()}`;
}

type OrdemApi = {
  id: string;
  numero: string;
  status: string;
  cliente?: { nome?: string | null; telefone?: string | null } | null;
  itens?: Array<{ id: string; descricao?: string | null; tipoItem?: string | null; possuiFotoRecebimento?: boolean }>;
};

function mapearOrdem(ordem: OrdemApi): OrdemParaFoto {
  return {
    id: ordem.id,
    numero: ordem.numero,
    status: ordem.status,
    cliente: { nome: ordem.cliente?.nome ?? "", telefone: ordem.cliente?.telefone ?? "" },
    itens: (ordem.itens ?? []).map((item) => ({
      id: item.id,
      descricao: item.descricao ?? "",
      tipoItem: item.tipoItem ?? "",
      ...(typeof item.possuiFotoRecebimento === "boolean" ? { possuiFotoRecebimento: item.possuiFotoRecebimento } : {}),
    })),
  };
}

/**
 * Prioriza a correspondência pelo número: "0124" ou "OS-16092026-0124" exatos
 * vêm antes de ocorrências parciais em nome/telefone. Ordem estável no resto.
 */
export function priorizarNumeroExato(ordens: OrdemParaFoto[], termo: string) {
  const alvo = termo.trim().toLowerCase();
  if (!alvo) return ordens;
  const exato = (ordem: OrdemParaFoto) => {
    const numero = ordem.numero.toLowerCase();
    return numero === alvo || numero.endsWith(`-${alvo}`);
  };
  return [...ordens.filter(exato), ...ordens.filter((ordem) => !exato(ordem))];
}

async function lerMensagem(response: Response, padrao: string) {
  const payload = await response.json().catch(() => null);
  return typeof payload?.message === "string" && payload.message ? payload.message : padrao;
}

function erroDeRede(error: unknown, mensagem: string) {
  if (error instanceof FluxoFotoError) return error;
  return new FluxoFotoError(mensagem);
}

/** Busca pela listagem existente (número, nome ou telefone do cliente). */
export async function buscarOrdensParaFoto(termo: string, fetcher: Fetcher = fetch): Promise<OrdemParaFoto[]> {
  if (!termo.trim()) return [];
  try {
    const response = await fetcher(montarUrlBuscaOrdensFoto(termo), { cache: "no-store" });
    if (!response.ok) {
      throw new FluxoFotoError(await lerMensagem(response, "Não foi possível buscar as ordens de serviço."), response.status);
    }
    const payload = (await response.json()) as { data?: OrdemApi[] };
    return priorizarNumeroExato((payload.data ?? []).map(mapearOrdem), termo);
  } catch (error) {
    throw erroDeRede(error, "Falha de conexão ao buscar ordens de serviço. Tente novamente.");
  }
}

/** Carrega o detalhe da OS selecionada para saber quais itens já têm foto. */
export async function carregarOrdemParaFoto(id: string, fetcher: Fetcher = fetch): Promise<OrdemParaFoto> {
  try {
    const response = await fetcher(`/api/ordens-servico/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 404) throw new FluxoFotoError("Ordem de serviço não encontrada.", 404);
    if (!response.ok) {
      throw new FluxoFotoError(await lerMensagem(response, "Não foi possível carregar a ordem de serviço."), response.status);
    }
    const payload = (await response.json()) as { ordemServico: OrdemApi };
    return mapearOrdem(payload.ordemServico);
  } catch (error) {
    throw erroDeRede(error, "Falha de conexão ao carregar a ordem de serviço. Tente novamente.");
  }
}

export type ResultadoEnvioFoto =
  | { ok: true }
  | { ok: false; motivo: "em-andamento" }
  /** A foto não pôde ser otimizada: é preciso tirar outra. */
  | { ok: false; motivo: "imagem"; mensagem: string }
  /** Falha de rede ou do servidor: a mesma foto pode ser reenviada. */
  | { ok: false; motivo: "envio"; mensagem: string; status?: number };

export type FaseEnvioFoto = "processando" | "enviando";

type DependenciasEnvio = {
  otimizar?: (file: File) => Promise<ImagemOtimizada>;
  fetcher?: Fetcher;
};

/**
 * Cria o enviador de uma tela. Garante uma única requisição por vez e guarda o
 * resultado da otimização da última foto, para que o "tentar novamente" após
 * falha de rede reenvie exatamente o mesmo arquivo sem reprocessar.
 */
export function criarEnviadorFotoOS({ otimizar = otimizarImagem, fetcher = fetch }: DependenciasEnvio = {}) {
  let emAndamento = false;
  let cache: { original: File; otimizada: ImagemOtimizada } | null = null;

  async function enviar(params: {
    ordemId: string;
    itemId: string;
    original: File;
    onFase?: (fase: FaseEnvioFoto) => void;
  }): Promise<ResultadoEnvioFoto> {
    if (emAndamento) return { ok: false, motivo: "em-andamento" };
    emAndamento = true;
    try {
      let otimizada: ImagemOtimizada;
      if (cache?.original === params.original) {
        otimizada = cache.otimizada;
      } else {
        params.onFase?.("processando");
        try {
          otimizada = await otimizar(params.original);
        } catch (error) {
          return {
            ok: false,
            motivo: "imagem",
            mensagem: error instanceof ImagemOtimizacaoError ? error.message : "Não foi possível processar a imagem.",
          };
        }
        cache = { original: params.original, otimizada };
      }

      params.onFase?.("enviando");
      const dados = new FormData();
      dados.set("foto", otimizada.file);
      let response: Response;
      try {
        response = await fetcher(
          `/api/ordens-servico/${encodeURIComponent(params.ordemId)}/itens/${encodeURIComponent(params.itemId)}/foto`,
          { method: "POST", body: dados },
        );
      } catch {
        return { ok: false, motivo: "envio", mensagem: "Falha de conexão ao enviar a foto. A foto foi mantida; tente novamente." };
      }
      if (!response.ok) {
        return {
          ok: false,
          motivo: "envio",
          status: response.status,
          mensagem: await lerMensagem(response, "Não foi possível salvar a foto."),
        };
      }
      cache = null;
      return { ok: true };
    } finally {
      emAndamento = false;
    }
  }

  return { enviar, estaEnviando: () => emAndamento, descartar: () => { cache = null; } };
}
