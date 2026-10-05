import Image from "next/image";

import { Button } from "@/components/ui";
import { formatarCentavos } from "@/lib/centavos";
import type { LinhaRevisada } from "@/lib/carrinho-catalogo";
import type { ProdutoCatalogo } from "@/lib/catalogo-publico";
import type { EnvioPedido } from "@/lib/pedido-whatsapp";

/**
 * Peças de apresentação do catálogo, sem estado nem efeitos, para que possam
 * ser testadas com `renderToStaticMarkup`.
 */

export function urlImagemCatalogo(produto: Pick<ProdutoCatalogo, "id" | "versaoImagem">) {
  return `/api/catalogo/produtos/${encodeURIComponent(produto.id)}/imagem?v=${produto.versaoImagem ?? ""}`;
}

function inicialDoNome(nome: string) {
  return nome.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? "?";
}

export function ProdutoCatalogoCardView({
  produto,
  quantidadeNoCarrinho,
  imagemFalhou = false,
  onAdicionar,
  onImagemFalhou,
}: {
  produto: ProdutoCatalogo;
  quantidadeNoCarrinho: number;
  imagemFalhou?: boolean;
  onAdicionar?: () => void;
  onImagemFalhou?: () => void;
}) {
  const mostrarImagem = Boolean(produto.versaoImagem) && !imagemFalhou;
  return (
    <article className="flex w-full min-w-0 flex-col overflow-hidden rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_28px_rgba(31,41,55,0.06)]">
      <div className="relative aspect-[4/3] bg-[color:var(--surface-muted)] sm:aspect-square">
        {mostrarImagem ? (
          <Image src={urlImagemCatalogo(produto)} alt={produto.nome} fill unoptimized sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" onError={onImagemFalhou} />
        ) : (
          <div role="img" aria-label={`${produto.nome} (sem foto)`} className="flex h-full items-center justify-center">
            <span aria-hidden="true" className="text-5xl font-semibold text-[color:var(--accent)]">
              {inicialDoNome(produto.nome)}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="break-words text-base font-semibold text-[color:var(--text)]">{produto.nome}</h3>
        {produto.descricao ? <p className="line-clamp-3 break-words text-sm text-slate-600">{produto.descricao}</p> : null}
        <p className="mt-auto pt-2 text-lg font-semibold text-[color:var(--accent-strong)]">{formatarCentavos(produto.precoCentavos)}</p>
        <Button type="button" onClick={onAdicionar} aria-label={`Adicionar ${produto.nome} ao carrinho`}>
          Adicionar ao carrinho
        </Button>
        {quantidadeNoCarrinho > 0 ? (
          <p className="text-center text-xs font-medium text-slate-600">No carrinho: {quantidadeNoCarrinho}</p>
        ) : null}
      </div>
    </article>
  );
}

export function PendenciasRevisaoView({ linhas }: { linhas: readonly LinhaRevisada[] }) {
  const pendentes = linhas.filter((linha) => linha.situacao !== "OK");
  if (pendentes.length === 0) return null;
  return (
    <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Alguns itens mudaram desde que você os adicionou:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {pendentes.map((linha) => (
          <li key={linha.item.produtoId} className="break-words">
            {linha.situacao === "INDISPONIVEL"
              ? `${linha.item.nome} não está mais disponível no catálogo.`
              : `${linha.item.nome}: o preço mudou de ${formatarCentavos(linha.item.precoCentavos)} para ${formatarCentavos(linha.precoAtualCentavos ?? 0)}.`}
          </li>
        ))}
      </ul>
      <p className="mt-2">Nada foi alterado sozinho. Confirme abaixo para atualizar o carrinho.</p>
    </div>
  );
}

export function EncaminhamentoView({
  envio,
  conversaAberta,
  onAbrirConversa,
}: {
  envio: Exclude<EnvioPedido, { status: "SEM_ITENS" }>;
  conversaAberta: boolean;
  onAbrirConversa?: () => void;
}) {
  const classesLink =
    "inline-flex items-center justify-center gap-2 rounded-full bg-[#1f7a46] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#17603a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a46] focus-visible:ring-offset-2";
  return (
    <div className="space-y-3">
      {envio.status === "PRONTO" ? (
        <a href={envio.link} target="_blank" rel="noopener noreferrer" onClick={onAbrirConversa} className={classesLink}>
          Abrir conversa no WhatsApp
        </a>
      ) : null}
      {envio.status === "LONGO" ? (
        <>
          <p className="text-sm text-slate-700">
            O resumo ficou grande demais para ir direto no link. Copie o resumo, abra a conversa e cole a mensagem.
          </p>
          <a href={envio.linkConversa} target="_blank" rel="noopener noreferrer" onClick={onAbrirConversa} className={classesLink}>
            Abrir conversa no WhatsApp
          </a>
        </>
      ) : null}
      {envio.status === "SEM_DESTINO" ? (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          O WhatsApp da loja não está disponível no momento. Copie o resumo para enviar por outro canal de atendimento da loja.
        </p>
      ) : null}
      {conversaAberta ? (
        <p role="status" className="rounded-2xl border border-black/10 bg-white p-3 text-sm text-slate-700">
          A conversa foi aberta no WhatsApp. O pedido só chega à loja quando você enviar a mensagem por lá, e a loja confirma
          disponibilidade, pagamento e entrega na conversa. Seu carrinho continua salvo aqui.
        </p>
      ) : null}
    </div>
  );
}
