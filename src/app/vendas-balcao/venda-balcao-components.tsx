import { Badge, Button, Card, EmptyState, PanelHeader, SearchInput, Textarea } from "@/components/ui";
import { IconeAlerta, IconeLixeira } from "@/components/icones";
import { type ItemCarrinho } from "@/lib/carrinho";

// ── Tipos Base ────────────────────────────────────────────────────────────────

export type ProdutoVenda = {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  quantidadeEstoque: number;
  ativo: boolean;
};

export type FormaPagamento = {
  id: string;
  nome: string;
};

export type EstadoVenda =
  | { tipo: "editando" }
  | { tipo: "enviando" }
  | { tipo: "sucesso"; numeroVenda: string; total: number }
  | { tipo: "erro"; mensagem: string };

// ── Funções Auxiliares ────────────────────────────────────────────────────────

import { formatCurrency } from "@/lib/formatters";
export function formatarMoeda(valor: number) {
  return formatCurrency(valor);
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

type SucessoVendaProps = {
  numeroVenda: string;
  total: number;
  onNovaVenda: () => void;
};

export function SucessoVenda({ numeroVenda, total, onNovaVenda }: SucessoVendaProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <Card className="w-full max-w-lg p-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--success-soft)]">
          <svg
            className="h-8 w-8 text-[color:var(--success)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--success)]">
          Venda concluída
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-[color:var(--text)]">
          {numeroVenda}
        </h2>
        <p className="mt-3 text-3xl font-extrabold text-[color:var(--accent-strong)]">
          {formatarMoeda(total)}
        </p>
        <p className="mt-2 text-sm text-[color:var(--text-soft)]">
          A entrada foi registrada no caixa automaticamente.
        </p>
        <div className="mt-8">
          <Button onClick={onNovaVenda} id="btn-nova-venda">
            Nova venda
          </Button>
        </div>
      </Card>
    </div>
  );
}

type CatalogoProdutosProps = {
  busca: string;
  setBusca: (busca: string) => void;
  avisoEstoque: string | null;
  produtosAtivos: ProdutoVenda[];
  produtosFiltrados: ProdutoVenda[];
  itens: ItemCarrinho[];
  onAdicionarProduto: (produto: ProdutoVenda) => void;
  semEstoque: (produto: ProdutoVenda) => boolean;
  semPreco: (produto: ProdutoVenda) => boolean;
  estoqueEsgotadoNoCarrinho: (produto: ProdutoVenda) => boolean;
};

export function CatalogoProdutos({
  busca,
  setBusca,
  avisoEstoque,
  produtosAtivos,
  produtosFiltrados,
  itens,
  onAdicionarProduto,
  semEstoque,
  semPreco,
  estoqueEsgotadoNoCarrinho,
}: CatalogoProdutosProps) {
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[color:var(--border)] px-[22px] py-[18px] lg:flex-row lg:items-center lg:gap-6">
        <div className="shrink-0">
          <h2 className="text-base font-extrabold text-[color:var(--text)]">Selecionar produto</h2>
          <p className="text-xs text-[color:var(--text-soft)]">
            {produtosAtivos.length === 1 ? "1 produto ativo" : `${produtosAtivos.length} produtos ativos`}
          </p>
        </div>
        <SearchInput
          id="busca-produto"
          label="Pesquisar produto"
          value={busca}
          onChange={setBusca}
          placeholder="Pesquisar pelo nome do produto..."
          className="min-w-0 flex-1"
        />
      </div>

      {/* Aviso de limite de estoque (não bloqueante) */}
      {avisoEstoque ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2.5 border-b border-[rgba(180,83,9,0.2)] bg-[color:var(--warning-soft)] px-[22px] py-3 text-[13px] font-semibold text-[color:var(--warning-badge-text)]"
        >
          <IconeAlerta className="h-4 w-4 shrink-0" />
          <span>{avisoEstoque}</span>
        </div>
      ) : null}

      <div className="p-[22px]">
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
          <div className="grid gap-3.5 sm:grid-cols-2 2xl:grid-cols-3">
            {produtosFiltrados.map((produto) => (
              <ProdutoCard
                key={produto.id}
                produto={produto}
                itens={itens}
                onAdicionarProduto={onAdicionarProduto}
                semEstoque={semEstoque(produto)}
                semPreco={semPreco(produto)}
                estoqueEsgotadoNoCarrinho={estoqueEsgotadoNoCarrinho(produto)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

type ProdutoCardProps = {
  produto: ProdutoVenda;
  itens: ItemCarrinho[];
  onAdicionarProduto: (produto: ProdutoVenda) => void;
  semEstoque: boolean;
  semPreco: boolean;
  estoqueEsgotadoNoCarrinho: boolean;
};

export function ProdutoCard({
  produto,
  itens,
  onAdicionarProduto,
  semEstoque,
  semPreco,
  estoqueEsgotadoNoCarrinho,
}: ProdutoCardProps) {
  const bloqueado = semEstoque || semPreco || estoqueEsgotadoNoCarrinho;
  const noCarrinho = itens.find((i) => i.produtoId === produto.id)?.quantidade ?? 0;

  let motivoBloqueio = "";
  if (semPreco) motivoBloqueio = "Sem preço configurado";
  else if (semEstoque) motivoBloqueio = "Sem estoque";
  else if (estoqueEsgotadoNoCarrinho) motivoBloqueio = `Limite de estoque atingido (${produto.quantidadeEstoque} un)`;

  const idMotivo = `motivo-${produto.id}`;

  return (
    <article
      aria-label={produto.nome}
      className={`flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] p-4 transition ${
        semEstoque || semPreco ? "bg-[color:var(--background)] opacity-80" : "bg-white hover:border-[rgba(140,90,50,0.4)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-bold text-[color:var(--text)]">{produto.nome}</p>
        {semPreco ? (
          <Badge tone="danger">Sem preço</Badge>
        ) : semEstoque ? (
          <Badge tone="danger">Sem estoque</Badge>
        ) : estoqueEsgotadoNoCarrinho ? (
          <Badge tone="warning">Limite no carrinho</Badge>
        ) : (
          <Badge tone="success">Estoque: {produto.quantidadeEstoque} un</Badge>
        )}
      </div>

      {produto.descricao ? <p className="-mt-1 truncate text-xs text-[color:var(--text-soft)]">{produto.descricao}</p> : null}

      <div className="mt-auto flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold text-[color:var(--text)]">{semPreco ? "—" : formatarMoeda(produto.precoVenda)}</p>
        <button
          type="button"
          id={`btn-adicionar-${produto.id}`}
          onClick={() => onAdicionarProduto(produto)}
          disabled={bloqueado}
          aria-label={`Adicionar ${produto.nome} ao carrinho`}
          aria-describedby={bloqueado ? idMotivo : undefined}
          title={motivoBloqueio || undefined}
          className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full px-3.5 text-[13px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] ${
            bloqueado
              ? "cursor-not-allowed bg-[color:var(--surface-muted)] text-[color:var(--muted)]"
              : "bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-strong)]"
          }`}
        >
          Adicionar
        </button>
      </div>
      {bloqueado ? (
        <p id={idMotivo} className="sr-only">
          {motivoBloqueio}
        </p>
      ) : noCarrinho > 0 ? (
        <p className="sr-only">{noCarrinho} no carrinho</p>
      ) : null}
    </article>
  );
}

type CarrinhoResumoProps = {
  itens: ItemCarrinho[];
  produtos: ProdutoVenda[];
  total: number;
  onRemoverItem: (produtoId: string) => void;
  onAjustarQuantidade: (produto: ProdutoVenda, novaQtd: number) => void;
  subtotalItem: (item: ItemCarrinho) => number;
};

export function CarrinhoResumo({
  itens,
  produtos,
  total,
  onRemoverItem,
  onAjustarQuantidade,
  subtotalItem,
}: CarrinhoResumoProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="border-b border-[color:var(--border)] px-[22px] py-4">
        <PanelHeader
          title="Resumo da venda"
          action={
            itens.length > 0 ? (
              <Badge tone="accent" size="md">{itens.length} {itens.length === 1 ? "item" : "itens"}</Badge>
            ) : null
          }
        />
      </div>

      {itens.length === 0 ? (
        <div className="m-[22px] rounded-2xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--background)] p-6 text-center text-sm text-[color:var(--text-soft)]">
          Carrinho vazio. Adicione produtos ao lado.
        </div>
      ) : (
        <ul className="divide-y divide-[rgba(74,53,35,0.1)] px-[22px] py-2">
          {itens.map((item) => (
            <CarrinhoItem
              key={item.produtoId}
              item={item}
              produto={produtos.find((p) => p.id === item.produtoId)}
              onRemoverItem={onRemoverItem}
              onAjustarQuantidade={onAjustarQuantidade}
              subtotal={subtotalItem(item)}
            />
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-[color:var(--border)] bg-[color:var(--accent-tint)] px-[22px] py-4">
        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[color:var(--accent-strong)]">Total</span>
        <span className="text-[26px] font-extrabold tracking-[-0.02em] text-[color:var(--text)]">{formatarMoeda(total)}</span>
      </div>
    </Card>
  );
}

type CarrinhoItemProps = {
  item: ItemCarrinho;
  produto?: ProdutoVenda;
  onRemoverItem: (produtoId: string) => void;
  onAjustarQuantidade: (produto: ProdutoVenda, novaQtd: number) => void;
  subtotal: number;
};

export function CarrinhoItem({
  item,
  produto,
  onRemoverItem,
  onAjustarQuantidade,
  subtotal,
}: CarrinhoItemProps) {
  const estoqueMax = produto ? produto.quantidadeEstoque : null;
  const noLimite = estoqueMax !== null && item.quantidade >= estoqueMax;
  const botaoStepper =
    "flex h-9 w-9 items-center justify-center text-base font-bold text-[color:var(--text)] transition hover:bg-[color:var(--surface-muted)] disabled:cursor-not-allowed disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--muted)]";

  return (
    <li className="flex flex-col gap-2.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[color:var(--text)]">{item.nome}</p>
          {noLimite ? (
            <p className="text-xs font-semibold text-[color:var(--warning-badge-text)]">Limite de estoque: {estoqueMax} un</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onRemoverItem(item.produtoId)}
          aria-label={`Remover ${item.nome} do carrinho`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[color:var(--muted)] transition hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
        >
          <IconeLixeira />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center overflow-hidden rounded-[10px] border border-[color:var(--border-strong)]">
            <button
              type="button"
              onClick={() => produto && onAjustarQuantidade(produto, item.quantidade - 1)}
              aria-label={`Diminuir quantidade de ${item.nome}`}
              disabled={item.quantidade <= 1}
              className={botaoStepper}
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-bold tabular-nums text-[color:var(--text)]" aria-live="polite">
              {item.quantidade}
            </span>
            <button
              type="button"
              onClick={() => produto && onAjustarQuantidade(produto, item.quantidade + 1)}
              aria-label={`Aumentar quantidade de ${item.nome}`}
              disabled={noLimite}
              title={noLimite ? `Estoque máximo: ${estoqueMax} un` : undefined}
              className={botaoStepper}
            >
              +
            </button>
          </div>
          <span className="text-xs text-[color:var(--text-soft)]">
            {item.quantidade} × {formatarMoeda(item.precoUnitario)}
          </span>
        </div>
        <p className="text-sm font-extrabold text-[color:var(--text)]">{formatarMoeda(subtotal)}</p>
      </div>
    </li>
  );
}

type PagamentoFormProps = {
  formasPagamento: FormaPagamento[];
  formaPagamentoId: string;
  setFormaPagamentoId: (id: string) => void;
  observacoes: string;
  setObservacoes: (obs: string) => void;
  erroValidacao: string | null;
  estado: EstadoVenda;
  setEstado: (estado: EstadoVenda) => void;
  enviando: boolean;
  itens: ItemCarrinho[];
  total: number;
  onFinalizar: () => void;
};

export function PagamentoForm({
  formasPagamento,
  formaPagamentoId,
  setFormaPagamentoId,
  observacoes,
  setObservacoes,
  erroValidacao,
  estado,
  setEstado,
  enviando,
  itens,
  total,
  onFinalizar,
}: PagamentoFormProps) {
  return (
    <Card className="flex flex-col gap-3.5 px-[22px] py-[18px]">
      <PanelHeader title="Forma de pagamento" description="Entrada registrada no caixa ao finalizar" />

      {formasPagamento.length === 0 ? (
        <p className="text-sm text-[color:var(--text-soft)]">Nenhuma forma de pagamento ativa cadastrada.</p>
      ) : (
        <div role="group" aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2">
          {formasPagamento.map((fp) => {
            const selecionado = formaPagamentoId === fp.id;
            return (
              <button
                key={fp.id}
                type="button"
                id={`btn-forma-${fp.id}`}
                onClick={() => setFormaPagamentoId(fp.id)}
                aria-pressed={selecionado}
                className={`min-h-11 rounded-xl border px-3 text-[13px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] ${
                  selecionado
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                    : "border-[color:var(--border-strong)] bg-white text-[color:var(--text-body)] hover:bg-[color:var(--surface-muted)]"
                }`}
              >
                {fp.nome}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-1">
        <label htmlFor="observacoes-venda" className="text-xs font-bold text-[color:var(--text-body)]">
          Observações
        </label>
        <Textarea
          id="observacoes-venda"
          rows={2}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex.: cliente solicitou troco para R$ 50"
          className="min-h-[64px]"
        />
      </div>

      {/* Erro de validação ou de negócio */}
      {erroValidacao ? (
        <p
          role="alert"
          className="rounded-xl border border-[rgba(185,28,28,0.25)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-badge-text)]"
        >
          {erroValidacao}
        </p>
      ) : null}

      {estado.tipo === "erro" ? (
        <div
          role="alert"
          className="rounded-xl border border-[rgba(185,28,28,0.25)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-badge-text)]"
        >
          <p className="font-bold">Não foi possível registrar a venda</p>
          <p className="mt-1">{estado.mensagem}</p>
          <button
            type="button"
            onClick={() => setEstado({ tipo: "editando" })}
            className="mt-2 text-xs font-semibold underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      <Button
        id="btn-finalizar-venda"
        onClick={onFinalizar}
        isLoading={enviando}
        disabled={itens.length === 0 || !formaPagamentoId}
        className="min-h-[52px] w-full text-[15px]"
      >
        {`Finalizar venda — ${formatarMoeda(total)}`}
      </Button>
    </Card>
  );
}
