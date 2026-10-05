import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EncaminhamentoView, PendenciasRevisaoView, ProdutoCatalogoCardView } from "./catalogo-view";

const produto = { id: "p1", nome: "Cadarço <b>120cm</b>", descricao: "Algodão", precoCentavos: 1050, versaoImagem: "abc123" };

describe("ProdutoCatalogoCardView", () => {
  it("mostra imagem pela rota pública com texto alternativo e preço em BRL", () => {
    const html = renderToStaticMarkup(createElement(ProdutoCatalogoCardView, { produto, quantidadeNoCarrinho: 0 }));

    expect(html).toContain("/api/catalogo/produtos/p1/imagem?v=abc123");
    expect(html).toContain('alt="Cadarço &lt;b&gt;120cm&lt;/b&gt;"');
    expect(html).toContain("R$ 10,50");
    expect(html).toContain('aria-label="Adicionar Cadarço &lt;b&gt;120cm&lt;/b&gt; ao carrinho"');
    // Nome vindo do cadastro é texto, nunca HTML.
    expect(html).not.toContain("<b>120cm</b>");
  });

  it.each([
    ["sem imagem cadastrada", { ...produto, versaoImagem: null }, false],
    ["imagem que falhou ao carregar", produto, true],
  ])("%s usa marcador acessível", (_caso, entrada, imagemFalhou) => {
    const html = renderToStaticMarkup(createElement(ProdutoCatalogoCardView, { produto: entrada, quantidadeNoCarrinho: 2, imagemFalhou }));

    expect(html).not.toContain("<img");
    expect(html).toContain('role="img"');
    expect(html).toContain("(sem foto)");
    expect(html).toContain("No carrinho: 2");
  });
});

describe("PendenciasRevisaoView", () => {
  const item = { produtoId: "p1", nome: "Cadarço", precoCentavos: 1000, quantidade: 1 };

  it("explica preço alterado e indisponibilidade sem alterar nada sozinho", () => {
    const html = renderToStaticMarkup(createElement(PendenciasRevisaoView, {
      linhas: [
        { item, situacao: "PRECO_ALTERADO", precoAtualCentavos: 1200, nomeAtual: "Cadarço" },
        { item: { ...item, produtoId: "p2", nome: "Palmilha" }, situacao: "INDISPONIVEL", precoAtualCentavos: null, nomeAtual: null },
      ],
    }));

    expect(html).toContain('role="alert"');
    expect(html).toContain("o preço mudou de R$ 10,00 para R$ 12,00");
    expect(html).toContain("Palmilha não está mais disponível");
    expect(html).toContain("Nada foi alterado sozinho");
  });

  it("não renderiza nada sem pendências", () => {
    expect(renderToStaticMarkup(createElement(PendenciasRevisaoView, {
      linhas: [{ item, situacao: "OK", precoAtualCentavos: 1000, nomeAtual: "Cadarço" }],
    }))).toBe("");
  });
});

describe("EncaminhamentoView", () => {
  it("abre conversa em nova aba e não anuncia pedido recebido", () => {
    const html = renderToStaticMarkup(createElement(EncaminhamentoView, {
      envio: { status: "PRONTO", resumo: "r", link: "https://wa.me/5561984492002?text=r" },
      conversaAberta: false,
    }));

    expect(html).toContain('href="https://wa.me/5561984492002?text=r"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toMatch(/pedido (recebido|enviado|confirmado)/i);
  });

  it("depois do clique deixa claro que o envio é feito no WhatsApp e o carrinho continua", () => {
    const html = renderToStaticMarkup(createElement(EncaminhamentoView, {
      envio: { status: "PRONTO", resumo: "r", link: "https://wa.me/5561984492002?text=r" },
      conversaAberta: true,
    }));

    expect(html).toContain("O pedido só chega à loja quando você enviar a mensagem");
    expect(html).toContain("Seu carrinho continua salvo");
  });

  it("sem destino configurado não oferece link do WhatsApp", () => {
    const html = renderToStaticMarkup(createElement(EncaminhamentoView, { envio: { status: "SEM_DESTINO", resumo: "r" }, conversaAberta: false }));

    expect(html).not.toContain("wa.me");
    expect(html).toContain("Copie o resumo");
  });

  it("resumo longo orienta copiar e colar", () => {
    const html = renderToStaticMarkup(createElement(EncaminhamentoView, {
      envio: { status: "LONGO", resumo: "r", linkConversa: "https://wa.me/5561984492002?text=oi" },
      conversaAberta: false,
    }));

    expect(html).toContain("grande demais");
    expect(html).toContain('href="https://wa.me/5561984492002?text=oi"');
  });
});
