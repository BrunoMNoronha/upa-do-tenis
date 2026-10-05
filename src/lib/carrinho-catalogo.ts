/**
 * Carrinho anônimo do catálogo público (#273). Módulo puro: roda no navegador
 * e nos testes. Valores em centavos inteiros; quantidade sempre inteira.
 *
 * O carrinho guarda só a referência do produto, o nome e o preço vistos pelo
 * visitante (para detectar mudança de preço na revisão) e a quantidade.
 * Nenhum dado pessoal. Nada aqui cria venda, reserva ou baixa de estoque.
 */
import { somarCentavos } from "./centavos";

export const CHAVE_CARRINHO_CATALOGO = "upa-do-tenis:catalogo:carrinho:v1";
export const QUANTIDADE_MAXIMA_ITEM = 99;
export const ITENS_MAXIMOS_CARRINHO = 50;

const ID_PRODUTO = /^[A-Za-z0-9_-]{1,64}$/;

export type ItemCarrinho = {
  produtoId: string;
  nome: string;
  precoCentavos: number;
  quantidade: number;
};

export type ProdutoParaCarrinho = {
  id: string;
  nome: string;
  precoCentavos: number;
};

export function idProdutoValido(valor: unknown): valor is string {
  return typeof valor === "string" && ID_PRODUTO.test(valor);
}

/** Inteiro entre 1 e o máximo por item; qualquer outra coisa é `null`. */
export function normalizarQuantidade(valor: unknown): number | null {
  const numero = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
  if (typeof numero !== "number" || !Number.isInteger(numero)) return null;
  if (numero < 1 || numero > QUANTIDADE_MAXIMA_ITEM) return null;
  return numero;
}

function centavosValidos(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isSafeInteger(valor) && valor >= 0;
}

function itemValido(valor: unknown): ItemCarrinho | null {
  if (!valor || typeof valor !== "object") return null;
  const bruto = valor as Record<string, unknown>;
  const quantidade = normalizarQuantidade(bruto.quantidade);
  if (!idProdutoValido(bruto.produtoId) || quantidade === null || !centavosValidos(bruto.precoCentavos)) return null;
  if (typeof bruto.nome !== "string" || bruto.nome.trim() === "") return null;
  return { produtoId: bruto.produtoId, nome: bruto.nome.slice(0, 200), precoCentavos: bruto.precoCentavos, quantidade };
}

/**
 * Lê o carrinho salvo. Conteúdo ausente, corrompido ou de outra versão volta
 * vazio sem lançar erro; `descartado` indica que havia algo ilegível.
 */
export function lerCarrinho(bruto: string | null): { itens: ItemCarrinho[]; descartado: boolean } {
  if (!bruto) return { itens: [], descartado: false };
  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return { itens: [], descartado: true };
  }
  const lista = (dados as { itens?: unknown })?.itens;
  if (!Array.isArray(lista)) return { itens: [], descartado: true };

  const itens: ItemCarrinho[] = [];
  let descartado = false;
  for (const entrada of lista) {
    const item = itemValido(entrada);
    if (!item || itens.some((existente) => existente.produtoId === item.produtoId) || itens.length >= ITENS_MAXIMOS_CARRINHO) {
      descartado = true;
      continue;
    }
    itens.push(item);
  }
  return { itens, descartado };
}

export function serializarCarrinho(itens: readonly ItemCarrinho[]): string {
  return JSON.stringify({ itens });
}

/** Soma ao item existente (até o máximo) ou inclui um novo. Atualiza nome e preço para os atuais. */
export function adicionarAoCarrinho(itens: readonly ItemCarrinho[], produto: ProdutoParaCarrinho, quantidade = 1): ItemCarrinho[] {
  const existente = itens.find((item) => item.produtoId === produto.id);
  if (existente) {
    const nova = Math.min(existente.quantidade + quantidade, QUANTIDADE_MAXIMA_ITEM);
    return itens.map((item) =>
      item.produtoId === produto.id ? { ...item, nome: produto.nome, precoCentavos: produto.precoCentavos, quantidade: nova } : item,
    );
  }
  if (itens.length >= ITENS_MAXIMOS_CARRINHO) return [...itens];
  return [...itens, { produtoId: produto.id, nome: produto.nome, precoCentavos: produto.precoCentavos, quantidade: Math.min(quantidade, QUANTIDADE_MAXIMA_ITEM) }];
}

/** Quantidade inválida não altera o carrinho. */
export function alterarQuantidade(itens: readonly ItemCarrinho[], produtoId: string, quantidade: unknown): ItemCarrinho[] {
  const valida = normalizarQuantidade(quantidade);
  if (valida === null) return [...itens];
  return itens.map((item) => (item.produtoId === produtoId ? { ...item, quantidade: valida } : item));
}

export function removerDoCarrinho(itens: readonly ItemCarrinho[], produtoId: string): ItemCarrinho[] {
  return itens.filter((item) => item.produtoId !== produtoId);
}

export function subtotalCentavos(item: Pick<ItemCarrinho, "precoCentavos" | "quantidade">): number {
  return item.precoCentavos * item.quantidade;
}

export function totalCentavos(itens: readonly ItemCarrinho[]): number {
  return somarCentavos(itens.map(subtotalCentavos));
}

export function quantidadeTotal(itens: readonly ItemCarrinho[]): number {
  return itens.reduce((total, item) => total + item.quantidade, 0);
}

// ---------------------------------------------------------------------------
// Revisão antes do WhatsApp: compara o carrinho com a leitura pública atual.
// ---------------------------------------------------------------------------

export type SituacaoLinhaRevisada = "OK" | "PRECO_ALTERADO" | "INDISPONIVEL";

export type LinhaRevisada = {
  item: ItemCarrinho;
  situacao: SituacaoLinhaRevisada;
  precoAtualCentavos: number | null;
  nomeAtual: string | null;
};

export function revisarCarrinho(itens: readonly ItemCarrinho[], atuais: readonly ProdutoParaCarrinho[]) {
  const porId = new Map(atuais.map((produto) => [produto.id, produto]));
  const linhas: LinhaRevisada[] = itens.map((item) => {
    const atual = porId.get(item.produtoId);
    if (!atual) return { item, situacao: "INDISPONIVEL", precoAtualCentavos: null, nomeAtual: null };
    return {
      item,
      situacao: atual.precoCentavos === item.precoCentavos ? "OK" : "PRECO_ALTERADO",
      precoAtualCentavos: atual.precoCentavos,
      nomeAtual: atual.nome,
    };
  });
  return { linhas, temPendencias: linhas.some((linha) => linha.situacao !== "OK") };
}

/**
 * Aplica, por decisão explícita do visitante, os preços atuais e retira o que
 * deixou de estar disponível. Nunca é chamada sem a ação do visitante.
 */
export function aplicarRevisao(itens: readonly ItemCarrinho[], atuais: readonly ProdutoParaCarrinho[]): ItemCarrinho[] {
  const porId = new Map(atuais.map((produto) => [produto.id, produto]));
  return itens.flatMap((item) => {
    const atual = porId.get(item.produtoId);
    return atual ? [{ ...item, nome: atual.nome, precoCentavos: atual.precoCentavos }] : [];
  });
}
