"use client";

import { Badge, Card, SectionTitle } from "@/components/ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type MovimentacaoProduto = {
  id: string;
  tipo: string;
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
  origem: string;
  observacao?: string | null;
  motivo?: string | null;
  venda?: { numero: string } | null;
  criadoEm: string;
};

type ProdutoDados = {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  quantidadeEstoque: number;
  ativo: boolean;
};

export function ProdutoMovimentacoesClient({
  initialData,
}: {
  initialData: {
    produto: ProdutoDados;
    movimentacoes: MovimentacaoProduto[];
  };
}) {
  const { produto, movimentacoes } = initialData;

  return (
    <section className="space-y-6">
      {/* Resumo do produto */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preço de Venda</p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--text)]">
            {currencyFormatter.format(produto.precoVenda)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Atual em Estoque</p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--text)]">
            {produto.quantidadeEstoque} <span className="text-sm font-normal text-slate-500">unidades</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
          <div className="mt-2">
            <Badge tone={produto.ativo ? "success" : "danger"}>
              {produto.ativo ? "Ativo no catálogo" : "Inativo"}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Extrato detalhado */}
      <Card className="bg-[color:var(--text)] p-6 text-white">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle className="text-xl">Histórico Rastreável de Movimentações</SectionTitle>
          <Badge tone="accent">Total: {movimentacoes.length}</Badge>
        </div>

        {movimentacoes.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
            Nenhuma movimentação registrada para este produto até o momento.
          </div>
        ) : (
          <div className="space-y-3">
            {movimentacoes.map((mov) => {
              const isEntrada =
                mov.tipo.includes("ENTRADA") ||
                mov.tipo.includes("ESTORNO");
              const isSaida =
                mov.tipo.includes("VENDA") ||
                mov.tipo.includes("SAIDA") ||
                mov.tipo.includes("BAIXA");

              let corBadge = "neutral";
              if (isEntrada) corBadge = "success";
              if (isSaida) corBadge = "danger";

              return (
                <div
                  key={mov.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <Badge tone={corBadge as any}>{mov.tipo}</Badge>
                      <span className="text-slate-400">
                        {dateFormatter.format(new Date(mov.criadoEm))}
                      </span>
                    </div>
                    <div className="text-right font-medium text-slate-200">
                      Saldo: {mov.saldoAnterior} → {mov.saldoPosterior} un
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4 text-slate-300">
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-slate-500">
                        Quantidade / Origem
                      </span>
                      <span className="mt-1 block font-medium">
                        {isSaida ? "-" : isEntrada ? "+" : ""}
                        {mov.quantidade} un ({mov.origem})
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-slate-500">
                        Referência
                      </span>
                      <span className="mt-1 block font-medium">
                        {mov.venda?.numero ? `Venda ${mov.venda.numero}` : "Direto"}
                      </span>
                    </div>
                  </div>

                  {(mov.observacao || mov.motivo) && (
                    <div className="mt-3 rounded-lg bg-black/20 p-3 text-xs text-slate-400">
                      {mov.motivo && <p><strong>Motivo:</strong> {mov.motivo}</p>}
                      {mov.observacao && <p><strong>Obs:</strong> {mov.observacao}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
