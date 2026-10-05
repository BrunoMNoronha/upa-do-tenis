import { describe, expect, it } from "vitest";

import {
  ITENS_MAXIMOS_CARRINHO,
  QUANTIDADE_MAXIMA_ITEM,
  adicionarAoCarrinho,
  alterarQuantidade,
  aplicarRevisao,
  lerCarrinho,
  normalizarQuantidade,
  quantidadeTotal,
  removerDoCarrinho,
  revisarCarrinho,
  serializarCarrinho,
  subtotalCentavos,
  totalCentavos,
  type ItemCarrinho,
} from "./carrinho-catalogo";

const cadarco = { id: "prod-cadarco", nome: "Cadarço 120cm", precoCentavos: 1000 };
const palmilha = { id: "prod-palmilha", nome: "Palmilha", precoCentavos: 3590 };

describe("normalizarQuantidade", () => {
  it.each([[1, 1], [99, 99], ["3", 3], [" 7 ", 7]])("aceita %j", (entrada, esperado) => {
    expect(normalizarQuantidade(entrada)).toBe(esperado);
  });

  it.each([0, -1, 1.5, "1,5", "2.5", 100, Number.NaN, Infinity, "", "abc", null, undefined, true, [1]])("recusa %j", (entrada) => {
    expect(normalizarQuantidade(entrada)).toBeNull();
  });
});

describe("operações do carrinho", () => {
  it("adiciona e combina o mesmo produto", () => {
    let itens = adicionarAoCarrinho([], cadarco);
    itens = adicionarAoCarrinho(itens, cadarco, 2);
    itens = adicionarAoCarrinho(itens, palmilha);

    expect(itens).toEqual([
      { produtoId: "prod-cadarco", nome: "Cadarço 120cm", precoCentavos: 1000, quantidade: 3 },
      { produtoId: "prod-palmilha", nome: "Palmilha", precoCentavos: 3590, quantidade: 1 },
    ]);
  });

  it("limita a quantidade por item ao máximo", () => {
    const itens = adicionarAoCarrinho([{ produtoId: cadarco.id, nome: cadarco.nome, precoCentavos: 1000, quantidade: 98 }], cadarco, 5);
    expect(itens[0].quantidade).toBe(QUANTIDADE_MAXIMA_ITEM);
  });

  it("não passa do número máximo de itens distintos", () => {
    let itens: ItemCarrinho[] = [];
    for (let i = 0; i < ITENS_MAXIMOS_CARRINHO + 5; i += 1) {
      itens = adicionarAoCarrinho(itens, { id: `p${i}`, nome: `P${i}`, precoCentavos: 100 });
    }
    expect(itens).toHaveLength(ITENS_MAXIMOS_CARRINHO);
  });

  it("edita quantidade válida e ignora inválida sem mutar a lista original", () => {
    const original = adicionarAoCarrinho([], cadarco);
    const alterado = alterarQuantidade(original, cadarco.id, "4");

    expect(alterado[0].quantidade).toBe(4);
    expect(original[0].quantidade).toBe(1);
    expect(alterarQuantidade(alterado, cadarco.id, 0)[0].quantidade).toBe(4);
    expect(alterarQuantidade(alterado, cadarco.id, 2.5)[0].quantidade).toBe(4);
  });

  it("remove item e esvaziar resulta em lista vazia", () => {
    const itens = adicionarAoCarrinho(adicionarAoCarrinho([], cadarco), palmilha);
    expect(removerDoCarrinho(itens, cadarco.id).map((item) => item.produtoId)).toEqual([palmilha.id]);
    expect(removerDoCarrinho(removerDoCarrinho(itens, cadarco.id), palmilha.id)).toEqual([]);
  });

  it("calcula subtotal e total em centavos exatos", () => {
    // 0,10 x 3 em ponto flutuante daria 0,30000000000000004.
    const dez = { id: "p10", nome: "Dez centavos", precoCentavos: 10 };
    const itens = adicionarAoCarrinho(adicionarAoCarrinho([], dez, 3), palmilha, 3);

    expect(subtotalCentavos(itens[0])).toBe(30);
    expect(subtotalCentavos(itens[1])).toBe(10770);
    expect(totalCentavos(itens)).toBe(10800);
    expect(quantidadeTotal(itens)).toBe(6);
  });
});

describe("persistência local", () => {
  it("faz ida e volta", () => {
    const itens = adicionarAoCarrinho(adicionarAoCarrinho([], cadarco, 2), palmilha);
    expect(lerCarrinho(serializarCarrinho(itens))).toEqual({ itens, descartado: false });
  });

  it("vazio quando não há nada salvo", () => {
    expect(lerCarrinho(null)).toEqual({ itens: [], descartado: false });
  });

  it.each(["{", "null", "[]", "{\"itens\":5}", "\"texto\""])("conteúdo corrompido %j volta vazio sem lançar", (bruto) => {
    expect(lerCarrinho(bruto)).toEqual({ itens: [], descartado: true });
  });

  it("descarta só as entradas inválidas ou duplicadas", () => {
    const bruto = JSON.stringify({
      itens: [
        { produtoId: "ok-1", nome: "Ok", precoCentavos: 100, quantidade: 2 },
        { produtoId: "ok-1", nome: "Duplicado", precoCentavos: 100, quantidade: 1 },
        { produtoId: "../caixa", nome: "Id malicioso", precoCentavos: 100, quantidade: 1 },
        { produtoId: "frac", nome: "Fracionado", precoCentavos: 100, quantidade: 1.5 },
        { produtoId: "preco", nome: "Preço quebrado", precoCentavos: 10.5, quantidade: 1 },
        { produtoId: "neg", nome: "Negativo", precoCentavos: -1, quantidade: 1 },
        { produtoId: "sem-nome", nome: "  ", precoCentavos: 100, quantidade: 1 },
        "lixo",
      ],
    });

    const lido = lerCarrinho(bruto);
    expect(lido.descartado).toBe(true);
    expect(lido.itens).toEqual([{ produtoId: "ok-1", nome: "Ok", precoCentavos: 100, quantidade: 2 }]);
  });
});

describe("revisão contra o catálogo atual", () => {
  const itens = adicionarAoCarrinho(adicionarAoCarrinho([], cadarco, 2), palmilha);

  it("sem mudanças não tem pendências", () => {
    const revisao = revisarCarrinho(itens, [cadarco, palmilha]);
    expect(revisao.temPendencias).toBe(false);
    expect(revisao.linhas.map((linha) => linha.situacao)).toEqual(["OK", "OK"]);
  });

  it("sinaliza preço alterado e produto retirado sem alterar o carrinho", () => {
    const revisao = revisarCarrinho(itens, [{ ...cadarco, precoCentavos: 1200 }]);

    expect(revisao.temPendencias).toBe(true);
    expect(revisao.linhas[0]).toMatchObject({ situacao: "PRECO_ALTERADO", precoAtualCentavos: 1200 });
    expect(revisao.linhas[1]).toMatchObject({ situacao: "INDISPONIVEL", precoAtualCentavos: null });
    expect(itens[0].precoCentavos).toBe(1000);
  });

  it("aplicarRevisao adota preços atuais e retira indisponíveis", () => {
    const atualizados = aplicarRevisao(itens, [{ ...cadarco, nome: "Cadarço 120 cm", precoCentavos: 1200 }]);
    expect(atualizados).toEqual([{ produtoId: cadarco.id, nome: "Cadarço 120 cm", precoCentavos: 1200, quantidade: 2 }]);
    expect(revisarCarrinho(atualizados, [{ ...cadarco, nome: "Cadarço 120 cm", precoCentavos: 1200 }]).temPendencias).toBe(false);
  });
});
