import { describe, expect, it } from "vitest";

import { adicionarAoCarrinho, type ItemCarrinho } from "./carrinho-catalogo";
import { LIMITE_LINK_WHATSAPP, MENSAGEM_CONVERSA_CURTA, montarEnvioPedido, montarResumoPedido } from "./pedido-whatsapp";

const NBSP = " ";
const itens = adicionarAoCarrinho(
  adicionarAoCarrinho([], { id: "p1", nome: "Cadarço & cia + 100% algodão", precoCentavos: 1050 }, 2),
  { id: "p2", nome: "Palmilha\nconforto", precoCentavos: 3590 },
);

function textoDoLink(link: string) {
  return new URL(link).searchParams.get("text") ?? "";
}

describe("montarResumoPedido", () => {
  it("lista quantidades, unitários, subtotais e total, sem frete, desconto ou número de pedido", () => {
    const resumo = montarResumoPedido({ nomeLoja: "UPA do Tênis", itens });

    expect(resumo).toContain("Olá, UPA do Tênis! Gostaria de fazer um pedido pelo catálogo do site:");
    expect(resumo).toContain(`- 2 x Cadarço & cia + 100% algodão (R$${NBSP}10,50 cada) = R$${NBSP}21,00`);
    expect(resumo).toContain(`- 1 x Palmilha conforto (R$${NBSP}35,90 cada) = R$${NBSP}35,90`);
    expect(resumo).toContain(`Total dos produtos: R$${NBSP}56,90`);
    expect(resumo).not.toMatch(/frete|desconto|pedido n[ºo°]/i);
  });
});

describe("montarEnvioPedido", () => {
  it("monta link wa.me para o número configurado com o texto codificado", () => {
    const envio = montarEnvioPedido({ whatsapp: "61984492002", nomeLoja: "UPA do Tênis", itens });

    expect(envio.status).toBe("PRONTO");
    if (envio.status !== "PRONTO") return;
    expect(envio.link.startsWith("https://wa.me/5561984492002?text=")).toBe(true);
    // &, +, % e quebras de linha não podem vazar crus para a query.
    const query = envio.link.split("?text=")[1];
    expect(query).not.toMatch(/[&+\n ]/);
    expect(query).toContain("%26");
    expect(query).toContain("%2B");
    expect(query).toContain("%25");
    expect(query).toContain("%0A");
    expect(textoDoLink(envio.link)).toBe(envio.resumo);
  });

  it("carrinho vazio não gera link", () => {
    expect(montarEnvioPedido({ whatsapp: "61984492002", nomeLoja: "Loja", itens: [] })).toEqual({ status: "SEM_ITENS" });
  });

  it.each([null, "", "123", "abc", "619844920021234"])("telefone %j inválido não gera link, mas mantém o resumo para copiar", (whatsapp) => {
    const envio = montarEnvioPedido({ whatsapp, nomeLoja: "Loja", itens });
    expect(envio.status).toBe("SEM_DESTINO");
    expect(envio).toHaveProperty("resumo");
    expect(JSON.stringify(envio)).not.toContain("wa.me");
  });

  it("resumo extenso abre conversa com texto curto e oferece o resumo completo para copiar", () => {
    let extenso: ItemCarrinho[] = [];
    for (let i = 0; i < 50; i += 1) {
      extenso = adicionarAoCarrinho(extenso, { id: `p${i}`, nome: `Produto com nome bem comprido número ${i}`, precoCentavos: 1999 }, 3);
    }

    const envio = montarEnvioPedido({ whatsapp: "6184492002", nomeLoja: "UPA do Tênis", itens: extenso });

    expect(envio.status).toBe("LONGO");
    if (envio.status !== "LONGO") return;
    expect(envio.linkConversa.length).toBeLessThanOrEqual(LIMITE_LINK_WHATSAPP);
    expect(textoDoLink(envio.linkConversa)).toBe(MENSAGEM_CONVERSA_CURTA);
    expect(envio.resumo).toContain("número 49");
  });
});
