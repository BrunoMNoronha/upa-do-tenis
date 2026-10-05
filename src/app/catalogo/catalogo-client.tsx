"use client";

import { useMemo, useRef, useState } from "react";

import { Button, Card, EmptyState, ErrorState, Input, Label } from "@/components/ui";
import { formatarCentavos } from "@/lib/centavos";
import {
  QUANTIDADE_MAXIMA_ITEM,
  adicionarAoCarrinho,
  alterarQuantidade,
  aplicarRevisao,
  normalizarQuantidade,
  quantidadeTotal,
  removerDoCarrinho,
  revisarCarrinho,
  subtotalCentavos,
  totalCentavos,
  type ItemCarrinho,
  type LinhaRevisada,
  type ProdutoParaCarrinho,
} from "@/lib/carrinho-catalogo";
import type { ProdutoCatalogo } from "@/lib/catalogo-publico";
import { montarEnvioPedido } from "@/lib/pedido-whatsapp";

import { EncaminhamentoView, PendenciasRevisaoView, ProdutoCatalogoCardView } from "./catalogo-view";
import { useCarrinhoCatalogo } from "./use-carrinho-catalogo";

type Loja = {
  nomeFantasia: string;
  nomeComplementar: string | null;
  horarioAtendimento: string | null;
};

type Props = {
  produtos: ProdutoCatalogo[];
  erroCarregamento: boolean;
  loja: Loja;
  whatsapp: string | null;
};

type EstadoRevisao =
  | { etapa: "inativa" }
  | { etapa: "carregando" }
  | { etapa: "erro"; mensagem: string }
  | { etapa: "pronta"; atuais: ProdutoParaCarrinho[]; linhas: LinhaRevisada[]; temPendencias: boolean };

function normalizarBusca(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

async function buscarProdutosAtuais(ids: string[]): Promise<ProdutoParaCarrinho[]> {
  const response = await fetch(`/api/catalogo/produtos?ids=${ids.map(encodeURIComponent).join(",")}`, { cache: "no-store" });
  if (!response.ok) throw new Error("revalidacao");
  const payload = (await response.json()) as { produtos?: ProdutoParaCarrinho[] };
  if (!Array.isArray(payload.produtos)) throw new Error("revalidacao");
  return payload.produtos;
}

function QuantidadeItem({ item, onAlterar }: { item: ItemCarrinho; onAlterar: (quantidade: number) => void }) {
  const [rascunho, setRascunho] = useState<string | null>(null);
  const inputId = `quantidade-${item.produtoId}`;
  const invalido = rascunho !== null && normalizarQuantidade(rascunho) === null;

  const confirmar = () => {
    if (rascunho === null) return;
    const valida = normalizarQuantidade(rascunho);
    if (valida !== null) onAlterar(valida);
    setRascunho(null);
  };

  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`Diminuir quantidade de ${item.nome}`} disabled={item.quantidade <= 1} onClick={() => onAlterar(item.quantidade - 1)} className="h-9 w-9 rounded-full border border-black/15 bg-white text-lg font-semibold text-slate-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]">−</button>
      <label htmlFor={inputId} className="sr-only">Quantidade de {item.nome}</label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={1}
        max={QUANTIDADE_MAXIMA_ITEM}
        step={1}
        value={rascunho ?? String(item.quantidade)}
        aria-invalid={invalido}
        onChange={(event) => setRascunho(event.target.value)}
        onBlur={confirmar}
        onKeyDown={(event) => {
          if (event.key === "Enter") confirmar();
        }}
        className="h-9 w-14 rounded-lg border border-black/15 bg-white text-center text-sm aria-[invalid=true]:border-rose-500"
      />
      <button type="button" aria-label={`Aumentar quantidade de ${item.nome}`} disabled={item.quantidade >= QUANTIDADE_MAXIMA_ITEM} onClick={() => onAlterar(item.quantidade + 1)} className="h-9 w-9 rounded-full border border-black/15 bg-white text-lg font-semibold text-slate-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]">+</button>
    </div>
  );
}

export function CatalogoClient({ produtos, erroCarregamento, loja, whatsapp }: Props) {
  const carrinho = useCarrinhoCatalogo();
  const [busca, setBusca] = useState("");
  const [revisao, setRevisao] = useState<EstadoRevisao>({ etapa: "inativa" });
  const [conversaAberta, setConversaAberta] = useState(false);
  const [copia, setCopia] = useState<"ok" | "falhou" | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const [imagensComFalha, setImagensComFalha] = useState<ReadonlySet<string>>(new Set());
  // Descarta revisão que termine depois de o carrinho mudar.
  const geracaoRevisao = useRef(0);

  const nomeLoja = loja.nomeFantasia;
  const itens = carrinho.itens;
  const termo = normalizarBusca(busca);
  const filtrados = useMemo(
    () => (termo ? produtos.filter((produto) => normalizarBusca(`${produto.nome} ${produto.descricao ?? ""}`).includes(termo)) : produtos),
    [produtos, termo],
  );

  // Qualquer mudança no carrinho exige nova revisão antes do WhatsApp.
  const mudarCarrinho = (transformar: (atual: ItemCarrinho[]) => ItemCarrinho[]) => {
    geracaoRevisao.current += 1;
    carrinho.atualizar(transformar);
    setRevisao({ etapa: "inativa" });
    setConversaAberta(false);
    setCopia(null);
  };

  const adicionar = (produto: ProdutoCatalogo) => {
    mudarCarrinho((atual) => adicionarAoCarrinho(atual, produto));
    setAnuncio(`${produto.nome} adicionado ao carrinho.`);
  };

  const esvaziar = () => {
    if (!window.confirm("Esvaziar o carrinho?")) return;
    mudarCarrinho(() => []);
    setAnuncio("Carrinho esvaziado.");
  };

  const revisar = async () => {
    if (itens.length === 0) return;
    const geracao = ++geracaoRevisao.current;
    setRevisao({ etapa: "carregando" });
    setConversaAberta(false);
    setCopia(null);
    try {
      const atuais = await buscarProdutosAtuais(itens.map((item) => item.produtoId));
      if (geracao !== geracaoRevisao.current) return;
      setRevisao({ etapa: "pronta", atuais, ...revisarCarrinho(itens, atuais) });
    } catch {
      if (geracao !== geracaoRevisao.current) return;
      setRevisao({ etapa: "erro", mensagem: "Não foi possível conferir preços e disponibilidade agora. Seu carrinho foi mantido." });
    }
  };

  const aceitarAlteracoes = () => {
    if (revisao.etapa !== "pronta") return;
    const atualizados = aplicarRevisao(itens, revisao.atuais);
    carrinho.atualizar(() => atualizados);
    setRevisao({ etapa: "pronta", atuais: revisao.atuais, ...revisarCarrinho(atualizados, revisao.atuais) });
    setAnuncio("Carrinho atualizado com os valores atuais.");
  };

  const envio = revisao.etapa === "pronta" && !revisao.temPendencias ? montarEnvioPedido({ whatsapp, nomeLoja, itens }) : null;

  const copiarResumo = async (resumo: string) => {
    try {
      await navigator.clipboard.writeText(resumo);
      setCopia("ok");
    } catch {
      setCopia("falhou");
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)] px-4 pb-24 pt-8 sm:px-6 lg:pb-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">{loja.nomeFantasia}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--text)]">Catálogo de produtos</h1>
          {loja.nomeComplementar ? <p className="mt-1 text-sm text-slate-600">{loja.nomeComplementar}</p> : null}
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Escolha os produtos, revise o carrinho e envie o pedido pelo WhatsApp. A loja confirma disponibilidade, pagamento e
            entrega na conversa.
          </p>
        </header>

        <p aria-live="polite" className="sr-only">{anuncio}</p>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-labelledby="titulo-produtos" className="min-w-0">
            <h2 id="titulo-produtos" className="sr-only">Produtos</h2>
            {erroCarregamento ? (
              <ErrorState
                title="Catálogo indisponível"
                description="Não foi possível carregar os produtos agora. Seu carrinho continua salvo."
                action={<Button type="button" onClick={() => window.location.reload()}>Tentar novamente</Button>}
              />
            ) : produtos.length === 0 ? (
              <EmptyState title="Nenhum produto no catálogo" description="Ainda não há produtos disponíveis. Volte em breve." />
            ) : (
              <>
                <div className="mb-4 grid gap-2">
                  <Label htmlFor="busca-catalogo">Buscar produto</Label>
                  <Input id="busca-catalogo" type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Ex.: cadarço" />
                </div>
                {filtrados.length === 0 ? (
                  <EmptyState title="Nenhum produto encontrado" description={`Nada corresponde a "${busca.trim()}". Tente outro termo.`} />
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtrados.map((produto) => (
                      <li key={produto.id} className="flex min-w-0">
                        <ProdutoCatalogoCardView
                          produto={produto}
                          quantidadeNoCarrinho={itens.find((item) => item.produtoId === produto.id)?.quantidade ?? 0}
                          imagemFalhou={imagensComFalha.has(produto.id)}
                          onAdicionar={() => adicionar(produto)}
                          onImagemFalhou={() => setImagensComFalha((atual) => new Set(atual).add(produto.id))}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <aside id="carrinho" aria-labelledby="titulo-carrinho" className="min-w-0 scroll-mt-4 lg:sticky lg:top-4 lg:self-start">
            <Card className="p-5">
              <h2 id="titulo-carrinho" className="text-xl font-semibold text-[color:var(--text)]">Seu carrinho</h2>
              {carrinho.aviso ? <p role="status" className="mt-2 text-xs text-amber-800">{carrinho.aviso}</p> : null}

              {!carrinho.carregado ? (
                <p className="mt-3 text-sm text-slate-600">Carregando carrinho...</p>
              ) : itens.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">Seu carrinho está vazio. Adicione produtos do catálogo.</p>
              ) : (
                <>
                  <ul className="mt-4 space-y-4">
                    {itens.map((item) => (
                      <li key={item.produtoId} className="border-b border-black/10 pb-4 last:border-b-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-[color:var(--text)]">{item.nome}</p>
                            <p className="text-xs text-slate-600">{formatarCentavos(item.precoCentavos)} cada</p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-[color:var(--text)]">{formatarCentavos(subtotalCentavos(item))}</p>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <QuantidadeItem item={item} onAlterar={(quantidade) => mudarCarrinho((atual) => alterarQuantidade(atual, item.produtoId, quantidade))} />
                          <button
                            type="button"
                            onClick={() => {
                              mudarCarrinho((atual) => removerDoCarrinho(atual, item.produtoId));
                              setAnuncio(`${item.nome} removido do carrinho.`);
                            }}
                            aria-label={`Remover ${item.nome} do carrinho`}
                            className="rounded-full px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                          >
                            Remover
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
                    <span className="text-sm font-medium text-slate-700">Total dos produtos</span>
                    <span className="text-lg font-semibold text-[color:var(--text)]">{formatarCentavos(totalCentavos(itens))}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Total sem frete. Pagamento e entrega são combinados na conversa com a loja.</p>

                  <div className="mt-4 grid gap-2">
                    <Button type="button" isLoading={revisao.etapa === "carregando"} onClick={() => void revisar()}>
                      {revisao.etapa === "pronta" ? "Conferir novamente" : "Revisar pedido"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={esvaziar}>Esvaziar carrinho</Button>
                  </div>

                  <div className="mt-4 space-y-3" aria-live="polite">
                    {revisao.etapa === "carregando" ? <p className="text-sm text-slate-600">Conferindo preços e disponibilidade...</p> : null}
                    {revisao.etapa === "erro" ? (
                      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        <p>{revisao.mensagem}</p>
                        <Button type="button" variant="secondary" className="mt-2" onClick={() => void revisar()}>Tentar novamente</Button>
                      </div>
                    ) : null}
                    {revisao.etapa === "pronta" && revisao.temPendencias ? (
                      <>
                        <PendenciasRevisaoView linhas={revisao.linhas} />
                        <Button type="button" variant="secondary" onClick={aceitarAlteracoes}>Atualizar carrinho com os valores atuais</Button>
                      </>
                    ) : null}
                    {envio && envio.status !== "SEM_ITENS" ? (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="resumo-pedido">Resumo do pedido</Label>
                          <textarea id="resumo-pedido" readOnly value={envio.resumo} rows={8} className="w-full resize-y rounded-xl border border-black/15 bg-white p-3 text-xs text-slate-700" />
                          <Button type="button" variant="secondary" onClick={() => void copiarResumo(envio.resumo)}>Copiar resumo</Button>
                          {copia === "ok" ? <p role="status" className="text-xs text-emerald-700">Resumo copiado.</p> : null}
                          {copia === "falhou" ? <p role="status" className="text-xs text-rose-700">Não foi possível copiar automaticamente. Selecione o texto acima e copie.</p> : null}
                        </div>
                        <EncaminhamentoView envio={envio} conversaAberta={conversaAberta} onAbrirConversa={() => setConversaAberta(true)} />
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </Card>

            {loja.horarioAtendimento ? (
              <p className="mt-4 text-xs leading-5 text-slate-600">
                <span className="font-semibold">Atendimento:</span> {loja.horarioAtendimento}
              </p>
            ) : null}
          </aside>
        </div>
      </div>

      {itens.length > 0 ? (
        <a href="#carrinho" className="fixed inset-x-4 bottom-4 z-10 flex items-center justify-between rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)] focus-visible:ring-offset-2">
          <span>Ver carrinho ({quantidadeTotal(itens)})</span>
          <span>{formatarCentavos(totalCentavos(itens))}</span>
        </a>
      ) : null}
    </main>
  );
}
