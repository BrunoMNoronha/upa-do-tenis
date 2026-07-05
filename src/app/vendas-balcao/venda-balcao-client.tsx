"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  Input,
  SectionTitle,
  EmptyState,
} from "@/components/ui";
import {
  adicionarItem,
  ajustarQuantidade,
  removerItem,
  subtotalItem,
  totalCarrinho,
  validarCarrinho,
  type ItemCarrinho,
} from "@/lib/carrinho";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ProdutoVenda = {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  quantidadeEstoque: number;
  ativo: boolean;
};

type FormaPagamento = {
  id: string;
  nome: string;
};

type VendaBalcaoClientProps = {
  produtos: ProdutoVenda[];
  formasPagamento: FormaPagamento[];
};

type EstadoVenda =
  | { tipo: "editando" }
  | { tipo: "enviando" }
  | { tipo: "sucesso"; numeroVenda: string; total: number }
  | { tipo: "erro"; mensagem: string };

// ── Formatadores locais ───────────────────────────────────────────────────────

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function formatarMoeda(valor: number) {
  return brl.format(valor);
}

/**
 * Humaniza mensagens de erro vindas do backend para o atendente.
 * Garante que nunca seja exibida mensagem técnica.
 */
function humanizarErroBackend(mensagem: string): string {
  const m = mensagem.toLowerCase();

  if (m.includes("caixa")) {
    if (m.includes("fechar") || m.includes("fechado") || m.includes("aberto")) {
      return "O caixa não está aberto. Peça ao responsável para abrir o caixa antes de registrar vendas.";
    }
  }
  if (m.includes("estoque") && (m.includes("insuficiente") || m.includes("disponível") || m.includes("disponivel"))) {
    return "Estoque insuficiente para um ou mais produtos. Verifique as quantidades e tente novamente.";
  }
  if (m.includes("inativo") || m.includes("não está ativo")) {
    return "Um ou mais produtos estão inativos no sistema. Remova-os do carrinho e tente novamente.";
  }
  if (m.includes("forma de pagamento") || m.includes("pagamento inválido") || m.includes("pagamento invalido")) {
    return "A forma de pagamento selecionada não é válida. Selecione outra opção e tente novamente.";
  }
  if (m.includes("preço") || m.includes("preco") || m.includes("valor")) {
    return "Um ou mais produtos não possuem preço configurado. Corrija o cadastro do produto e tente novamente.";
  }
  // Mensagem original se for legível para o atendente (sem stack trace / termos técnicos)
  const parece_tecnica = m.includes("error:") || m.includes("prisma") || m.includes("stack") || m.includes("undefined");
  if (parece_tecnica) {
    return "Não foi possível registrar a venda. Tente novamente ou acione o suporte técnico.";
  }
  return mensagem;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function VendaBalcaoClient({ produtos, formasPagamento }: VendaBalcaoClientProps) {
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [formaPagamentoId, setFormaPagamentoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [estado, setEstado] = useState<EstadoVenda>({ tipo: "editando" });
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  // Toast de aviso não bloqueante (ex: atingiu limite de estoque mas operação parcial ok)
  const [avisoEstoque, setAvisoEstoque] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Apenas produtos ativos
  const produtosAtivos = produtos.filter((p) => p.ativo);

  // Filtro por nome (normalizado para evitar problema com acentos)
  const normalizar = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const produtosFiltrados = busca.trim()
    ? produtosAtivos.filter((p) => normalizar(p.nome).includes(normalizar(busca.trim())))
    : produtosAtivos;

  const total = totalCarrinho(itens);
  const enviando = estado.tipo === "enviando";

  // ── Helpers de estoque ────────────────────────────────────────────────────

  /** Retorna a quantidade já no carrinho para um produto. */
  const qtdNoCarrinho = (produtoId: string) =>
    itens.find((i) => i.produtoId === produtoId)?.quantidade ?? 0;

  /** Saldo de estoque ainda disponível para adicionar ao carrinho. */
  const saldoDisponivel = (produto: ProdutoVenda) =>
    produto.quantidadeEstoque - qtdNoCarrinho(produto.id);

  const semEstoque = (produto: ProdutoVenda) => produto.quantidadeEstoque <= 0;
  const semPreco = (produto: ProdutoVenda) => produto.precoVenda <= 0;
  const estoqueEsgotadoNoCarrinho = (produto: ProdutoVenda) => saldoDisponivel(produto) <= 0;

  // ── Handlers do carrinho ──────────────────────────────────────────────────

  const handleAdicionarProduto = (produto: ProdutoVenda) => {
    setErroValidacao(null);
    setAvisoEstoque(null);

    const resultado = adicionarItem(itens, produto, produto.quantidadeEstoque);

    if (!resultado.ok) {
      setErroValidacao(resultado.motivo);
      return;
    }

    // Se houve limitação silenciosa (adicionou menos que o pedido), avisa
    const qtdAntes = qtdNoCarrinho(produto.id);
    const qtdDepois = resultado.itens.find((i) => i.produtoId === produto.id)?.quantidade ?? 0;
    if (qtdDepois === qtdAntes) {
      setAvisoEstoque(`Limite de estoque atingido para "${produto.nome}" (${produto.quantidadeEstoque} un).`);
    } else if (qtdDepois < qtdAntes + 1) {
      setAvisoEstoque(`Adicionado com quantidade ajustada ao limite de estoque (${produto.quantidadeEstoque} un).`);
    }

    setItens(resultado.itens);
  };

  const handleAjustarQuantidade = (produto: ProdutoVenda, novaQtd: number) => {
    setAvisoEstoque(null);
    const estoqueMax = produto.quantidadeEstoque > 0 ? produto.quantidadeEstoque : null;
    const novasItens = ajustarQuantidade(itens, produto.id, novaQtd, estoqueMax);

    // Verifica se a quantidade foi limitada ao estoque
    const qtdFinal = novasItens.find((i) => i.produtoId === produto.id)?.quantidade ?? novaQtd;
    if (estoqueMax !== null && novaQtd > estoqueMax && qtdFinal === estoqueMax) {
      setAvisoEstoque(`Quantidade máxima disponível em estoque: ${estoqueMax} un.`);
    }

    setItens(novasItens);
  };

  const handleRemoverItem = (produtoId: string) => {
    setAvisoEstoque(null);
    setItens((atual) => removerItem(atual, produtoId));
  };

  // ── Finalização da venda ──────────────────────────────────────────────────

  const handleFinalizar = () => {
    setErroValidacao(null);
    setAvisoEstoque(null);

    const erro = validarCarrinho(itens);
    if (erro) {
      setErroValidacao(erro);
      return;
    }

    if (!formaPagamentoId) {
      setErroValidacao("Selecione a forma de pagamento antes de finalizar.");
      return;
    }

    setEstado({ tipo: "enviando" });

    startTransition(async () => {
      try {
        const payload = {
          formaPagamentoId,
          observacoes: observacoes.trim() || undefined,
          itens: itens.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
          })),
        };

        const response = await fetch("/api/vendas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = (await response.json()) as { message?: string };
          const mensagemBruta = body.message ?? "Não foi possível registrar a venda.";
          setEstado({
            tipo: "erro",
            mensagem: humanizarErroBackend(mensagemBruta),
          });
          return;
        }

        const venda = (await response.json()) as {
          numero?: string;
          valorTotal?: number;
        };

        setEstado({
          tipo: "sucesso",
          numeroVenda: venda.numero ?? "—",
          total,
        });
      } catch {
        setEstado({
          tipo: "erro",
          mensagem: "Erro de conexão. Verifique a rede e tente novamente.",
        });
      }
    });
  };

  const handleNovaVenda = () => {
    setItens([]);
    setFormaPagamentoId("");
    setObservacoes("");
    setBusca("");
    setErroValidacao(null);
    setAvisoEstoque(null);
    setEstado({ tipo: "editando" });
  };

  // ── Tela de sucesso ───────────────────────────────────────────────────────

  if (estado.tipo === "sucesso") {
    return (
      <div className="mt-6 flex flex-col items-center justify-center gap-6">
        <Card className="w-full max-w-lg p-10 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Venda Concluída
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">
            {estado.numeroVenda}
          </h2>
          <p className="mt-3 text-3xl font-bold text-[color:var(--accent-strong)]">
            {formatarMoeda(estado.total)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            A entrada foi registrada no caixa automaticamente.
          </p>
          <div className="mt-8">
            <Button onClick={handleNovaVenda} id="btn-nova-venda">
              Nova Venda
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Layout principal ──────────────────────────────────────────────────────

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
      {/* Coluna esquerda: pesquisa + lista de produtos */}
      <div className="space-y-4">
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            Catálogo
          </p>
          <SectionTitle className="mt-1 text-xl">Selecionar Produto</SectionTitle>

          <div className="mt-4">
            <Input
              id="busca-produto"
              type="search"
              placeholder="Pesquisar pelo nome do produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Pesquisar produto"
            />
          </div>
        </Card>

        {/* Aviso de limite de estoque (não bloqueante) */}
        {avisoEstoque ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{avisoEstoque}</span>
          </div>
        ) : null}

        {produtosAtivos.length === 0 ? (
          <EmptyState
            title="Nenhum produto ativo"
            description="Cadastre produtos ativos em Produtos para habilitá-los para venda de balcão."
          />
        ) : produtosFiltrados.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description={`Não há produtos ativos com o nome "${busca}".`}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {produtosFiltrados.map((produto) => {
              const bloqueadoSemEstoque = semEstoque(produto);
              const bloqueadoSemPreco = semPreco(produto);
              const bloqueadoLimite = !bloqueadoSemEstoque && estoqueEsgotadoNoCarrinho(produto);
              const bloqueado = bloqueadoSemEstoque || bloqueadoSemPreco || bloqueadoLimite;

              let motivoBloqueio = "";
              if (bloqueadoSemPreco) motivoBloqueio = "Sem preço configurado";
              else if (bloqueadoSemEstoque) motivoBloqueio = "Sem estoque";
              else if (bloqueadoLimite) motivoBloqueio = "Limite de estoque atingido";

              return (
                <article
                  key={produto.id}
                  aria-label={produto.nome}
                  className={`flex items-center justify-between gap-4 rounded-[1.5rem] border p-5 shadow-sm transition ${
                    bloqueado
                      ? "border-slate-200 bg-slate-50 opacity-70"
                      : "border-[color:var(--border)] bg-[color:var(--surface)] hover:shadow-md"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${bloqueado ? "text-slate-500" : "text-[color:var(--text)]"}`}>
                      {produto.nome}
                    </p>
                    {produto.descricao ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{produto.descricao}</p>
                    ) : null}

                    {/* Preço */}
                    {bloqueadoSemPreco ? (
                      <p className="mt-1 text-xs font-medium text-rose-500">Sem preço configurado</p>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-[color:var(--accent-strong)]">
                        {formatarMoeda(produto.precoVenda)}
                      </p>
                    )}

                    {/* Badge de estoque */}
                    <div className="mt-2">
                      {bloqueadoSemEstoque ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                          Sem estoque
                        </span>
                      ) : bloqueadoLimite ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                          Limite atingido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                          Estoque: {produto.quantidadeEstoque} un
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    id={`btn-adicionar-${produto.id}`}
                    onClick={() => handleAdicionarProduto(produto)}
                    disabled={bloqueado}
                    aria-label={
                      bloqueado
                        ? `${produto.nome}: ${motivoBloqueio}`
                        : `Adicionar ${produto.nome} ao carrinho`
                    }
                    title={bloqueado ? motivoBloqueio : undefined}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] ${
                      bloqueado
                        ? "cursor-not-allowed bg-slate-200 text-slate-400"
                        : "bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-strong)]"
                    }`}
                  >
                    {bloqueado ? (
                      motivoBloqueio || "Indisponível"
                    ) : itens.find((i) => i.produtoId === produto.id) ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        +1
                      </>
                    ) : (
                      "Adicionar"
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Coluna direita: carrinho + pagamento */}
      <div className="space-y-4">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                Carrinho
              </p>
              <SectionTitle className="mt-1 text-xl">Resumo da Venda</SectionTitle>
            </div>
            {itens.length > 0 ? (
              <Badge tone="accent">{itens.length} {itens.length === 1 ? "item" : "itens"}</Badge>
            ) : null}
          </div>

          {itens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Carrinho vazio. Adicione produtos ao lado.
            </div>
          ) : (
            <div className="space-y-3">
              {itens.map((item) => {
                const produto = produtos.find((p) => p.id === item.produtoId);
                const estoqueMax = produto ? produto.quantidadeEstoque : null;
                const noLimite = estoqueMax !== null && item.quantidade >= estoqueMax;

                return (
                  <div
                    key={item.produtoId}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[color:var(--text)]">
                          {item.nome}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatarMoeda(item.precoUnitario)} / un
                        </p>
                        {noLimite ? (
                          <p className="mt-0.5 text-xs font-medium text-amber-600">
                            Limite de estoque: {estoqueMax} un
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoverItem(item.produtoId)}
                        aria-label={`Remover ${item.nome} do carrinho`}
                        className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => produto && handleAjustarQuantidade(produto, item.quantidade - 1)}
                          aria-label="Diminuir quantidade"
                          disabled={item.quantidade <= 1}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border)] text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => produto && handleAjustarQuantidade(produto, item.quantidade + 1)}
                          aria-label="Aumentar quantidade"
                          disabled={noLimite}
                          title={noLimite ? `Estoque máximo: ${estoqueMax} un` : undefined}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border)] text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-bold text-[color:var(--text)]">
                        {formatarMoeda(subtotalItem(item))}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between rounded-2xl bg-[color:var(--accent-soft)] px-4 py-3">
                <span className="text-sm font-semibold text-[color:var(--accent-strong)]">Total</span>
                <span className="text-xl font-bold text-[color:var(--accent-strong)]">
                  {formatarMoeda(total)}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Pagamento */}
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            Pagamento
          </p>
          <SectionTitle className="mt-1 text-xl">Forma de Pagamento</SectionTitle>

          <div className="mt-4 space-y-3">
            {formasPagamento.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma forma de pagamento ativa cadastrada.
              </p>
            ) : (
              <div className="grid gap-2">
                {formasPagamento.map((fp) => {
                  const selecionado = formaPagamentoId === fp.id;
                  return (
                    <button
                      key={fp.id}
                      type="button"
                      id={`btn-forma-${fp.id}`}
                      onClick={() => setFormaPagamentoId(fp.id)}
                      aria-pressed={selecionado}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] ${
                        selecionado
                          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                          : "border-[color:var(--border)] bg-white text-slate-700 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
                      }`}
                    >
                      {fp.nome}
                    </button>
                  );
                })}
              </div>
            )}

            <div>
              <label
                htmlFor="observacoes-venda"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Observações <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <textarea
                id="observacoes-venda"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: cliente solicitou troco para R$ 50"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
              />
            </div>

            {/* Erro de validação ou de negócio */}
            {erroValidacao ? (
              <p
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {erroValidacao}
              </p>
            ) : null}

            {estado.tipo === "erro" ? (
              <div
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                <p className="font-semibold">Não foi possível registrar a venda</p>
                <p className="mt-1">{estado.mensagem}</p>
                <button
                  type="button"
                  onClick={() => setEstado({ tipo: "editando" })}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}

            <Button
              id="btn-finalizar-venda"
              onClick={handleFinalizar}
              disabled={enviando || itens.length === 0 || !formaPagamentoId}
              className="w-full"
            >
              {enviando ? "Registrando venda..." : `Finalizar Venda — ${formatarMoeda(total)}`}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
