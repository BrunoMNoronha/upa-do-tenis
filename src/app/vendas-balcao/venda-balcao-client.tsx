"use client";

import { useState, useTransition } from "react";
import {
  adicionarItem,
  ajustarQuantidade,
  removerItem,
  subtotalItem,
  totalCarrinho,
  validarCarrinho,
  type ItemCarrinho,
} from "@/lib/carrinho";
import {
  SucessoVenda,
  CatalogoProdutos,
  CarrinhoResumo,
  PagamentoForm,
  type ProdutoVenda,
  type FormaPagamento,
  type EstadoVenda,
} from "./venda-balcao-components";

type VendaBalcaoClientProps = {
  produtos: ProdutoVenda[];
  formasPagamento: FormaPagamento[];
};

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
      <SucessoVenda
        numeroVenda={estado.numeroVenda}
        total={estado.total}
        onNovaVenda={handleNovaVenda}
      />
    );
  }

  // ── Layout principal ──────────────────────────────────────────────────────

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
      <CatalogoProdutos
        busca={busca}
        setBusca={setBusca}
        avisoEstoque={avisoEstoque}
        produtosAtivos={produtosAtivos}
        produtosFiltrados={produtosFiltrados}
        itens={itens}
        onAdicionarProduto={handleAdicionarProduto}
        semEstoque={semEstoque}
        semPreco={semPreco}
        estoqueEsgotadoNoCarrinho={estoqueEsgotadoNoCarrinho}
      />

      <div className="space-y-4">
        <CarrinhoResumo
          itens={itens}
          produtos={produtos}
          total={total}
          onRemoverItem={handleRemoverItem}
          onAjustarQuantidade={handleAjustarQuantidade}
          subtotalItem={subtotalItem}
        />

        <PagamentoForm
          formasPagamento={formasPagamento}
          formaPagamentoId={formaPagamentoId}
          setFormaPagamentoId={setFormaPagamentoId}
          observacoes={observacoes}
          setObservacoes={setObservacoes}
          erroValidacao={erroValidacao}
          estado={estado}
          setEstado={setEstado}
          enviando={enviando}
          itens={itens}
          total={total}
          onFinalizar={handleFinalizar}
        />
      </div>
    </div>
  );
}
