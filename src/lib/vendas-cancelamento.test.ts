import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as cancelarAPI } from "@/app/api/vendas/[id]/cancelamento/route";
import { obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { obterDetalhesCaixa, travarCaixa } from "@/lib/caixa";
import * as estoqueModule from "@/lib/movimentacao-estoque-produto-service";
import { normalizarPaginacao } from "@/lib/paginacao";
import { prisma } from "@/lib/prisma";
import { listarVendasBalcaoPaginado, obterVendaPorId, registrarVendaBalcao } from "@/lib/vendas";
import { cancelarVendaBalcao } from "@/lib/vendas-cancelamento";

// Cancelamento total de venda de balcão, contra o banco real de testes.
// Apenas a sessão é simulada.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
  obterUsuarioSessaoDaRequest: vi.fn(),
}));

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];

let dinheiroId: string;
let pixId: string;
let produtoAId: string; // estoque 10, preço 15.90
let produtoBId: string; // estoque 5, preço 10.00
let usuarioId: string;
let caixaId: string;
let caixaIds: string[];

function cancelar(id: string, body: unknown = { motivo: "Venda lançada errada" }) {
  return cancelarAPI(
    new NextRequest(`http://localhost/api/vendas/${id}/cancelamento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function vender(formaPagamentoId = dinheiroId) {
  const venda = await registrarVendaBalcao({
    formaPagamentoId,
    itens: [
      { produtoId: produtoAId, quantidade: 2 },
      { produtoId: produtoBId, quantidade: 1 },
    ],
  });
  return venda!;
}

async function estoque(produtoId: string) {
  return Number((await prisma.produto.findUniqueOrThrow({ where: { id: produtoId } })).quantidadeEstoque);
}

async function totaisCaixa() {
  return (await obterDetalhesCaixa(caixaId))!.totais;
}

function contarSaidasCancelamento(vendaId: string) {
  return prisma.movimentacaoCaixa.count({ where: { vendaId, origem: "CANCELAMENTO_VENDA_BALCAO" } });
}

function contarDevolucoes(vendaId: string) {
  return prisma.movimentacaoEstoqueProduto.count({ where: { vendaId, tipo: "ESTORNO_VENDA" } });
}

async function novoCaixa() {
  const caixa = await prisma.caixa.create({ data: { saldoInicial: 100, status: "ABERTO" } });
  caixaIds.push(caixa.id);
  return caixa.id;
}

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Este teste requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  caixaIds = [];
  dinheiroId = (await prisma.formaPagamento.create({ data: { nome: `Dinheiro cancel ${randomUUID()}`, tipo: "DINHEIRO" } })).id;
  pixId = (await prisma.formaPagamento.create({ data: { nome: `PIX cancel ${randomUUID()}`, tipo: "PIX" } })).id;
  produtoAId = (await prisma.produto.create({ data: { nome: "Cadarço cancel", precoVenda: 15.9, quantidadeEstoque: 10 } })).id;
  produtoBId = (await prisma.produto.create({ data: { nome: "Palmilha cancel", precoVenda: 10, quantidadeEstoque: 5 } })).id;
  usuarioId = (
    await prisma.usuario.create({ data: { nome: "Operador cancel", email: `cancel-${randomUUID()}@teste.local`, senhaHash: "x" } })
  ).id;
  vi.mocked(obterUsuarioSessaoDaRequest).mockResolvedValue({ id: usuarioId, nome: "Operador cancel", ativo: true } as never);
  await prisma.caixa.updateMany({ where: { status: "ABERTO" }, data: { status: "FECHADO" } });
  caixaId = await novoCaixa();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const produtos = [produtoAId, produtoBId];
  // Ordem das FKs: movimentações -> itens -> vendas -> produtos/caixas/formas/usuário.
  await prisma.movimentacaoEstoqueProduto.deleteMany({ where: { produtoId: { in: produtos } } });
  await prisma.movimentacaoCaixa.deleteMany({ where: { caixaId: { in: caixaIds } } });
  await prisma.venda.deleteMany({ where: { formaPagamentoId: { in: [dinheiroId, pixId] } } });
  await prisma.produto.deleteMany({ where: { id: { in: produtos } } });
  await prisma.caixa.deleteMany({ where: { id: { in: caixaIds } } });
  await prisma.formaPagamento.deleteMany({ where: { id: { in: [dinheiroId, pixId] } } });
  await prisma.usuario.delete({ where: { id: usuarioId } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("API de cancelamento de venda de balcão", () => {
  it("cancela a venda inteira: estoque volta, saída no caixa na forma da venda e venda fica no histórico", async () => {
    const venda = await vender();
    expect(Number(venda.valorTotal)).toBe(41.8);
    expect(await estoque(produtoAId)).toBe(8);
    expect(await estoque(produtoBId)).toBe(4);
    const antes = await totaisCaixa();

    const resposta = await cancelar(venda.id, { motivo: "  Cliente desistiu da compra  " });
    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo).toMatchObject({
      status: "CANCELADA",
      motivoCancelamento: "Cliente desistiu da compra",
      canceladoPorId: usuarioId,
      canceladoPor: { nome: "Operador cancel" },
    });
    expect(corpo.dataCancelamento).toBeTruthy();

    // Estoque de volta, com movimentação ESTORNO_VENDA por item.
    expect(await estoque(produtoAId)).toBe(10);
    expect(await estoque(produtoBId)).toBe(5);
    const devolucoes = await prisma.movimentacaoEstoqueProduto.findMany({
      where: { vendaId: venda.id, tipo: "ESTORNO_VENDA" },
      orderBy: { produtoId: "asc" },
    });
    expect(devolucoes).toHaveLength(2);
    const devolucaoA = devolucoes.find((mov) => mov.produtoId === produtoAId)!;
    expect(devolucaoA).toMatchObject({ origem: "VENDA_BALCAO", motivo: "Cliente desistiu da compra" });
    expect(Number(devolucaoA.quantidade)).toBe(2);
    expect(Number(devolucaoA.saldoAnterior)).toBe(8);
    expect(Number(devolucaoA.saldoPosterior)).toBe(10);
    expect(devolucaoA.itemVendaId).toBeTruthy();

    // Uma saída no caixa, no valor total e na forma da venda.
    const saidas = await prisma.movimentacaoCaixa.findMany({ where: { vendaId: venda.id, origem: "CANCELAMENTO_VENDA_BALCAO" } });
    expect(saidas).toHaveLength(1);
    expect(saidas[0]).toMatchObject({
      caixaId,
      tipo: "SAIDA",
      formaPagamentoId: dinheiroId,
      descricao: `Cancelamento da venda de balcão ${venda.numero}`,
    });
    expect(Number(saidas[0].valor)).toBe(41.8);
    const depois = await totaisCaixa();
    expect(depois.saldoFisicoCalculado).toBeCloseTo(antes.saldoFisicoCalculado - 41.8, 2);

    // A venda continua no histórico, marcada como cancelada.
    const listagem = await listarVendasBalcaoPaginado({ paginacao: normalizarPaginacao({}) });
    expect(listagem.data.find((item) => item.id === venda.id)).toMatchObject({ status: "CANCELADA" });
    const detalhe = await obterVendaPorId(venda.id);
    expect(detalhe).toMatchObject({ status: "CANCELADA", canceladoPor: { nome: "Operador cancel" } });
    expect(detalhe!.itens).toHaveLength(2);
  });

  it("venda não cancelada aparece na listagem como CONCLUIDA, sem dados de cancelamento", async () => {
    const venda = await vender(pixId);
    const listagem = await listarVendasBalcaoPaginado({ paginacao: normalizarPaginacao({}) });
    expect(listagem.data.find((item) => item.id === venda.id)).toMatchObject({ status: "CONCLUIDA", dataCancelamento: null });
  });

  it("recusa cancelar de novo sem devolver estoque nem lançar outra saída", async () => {
    const venda = await vender();
    expect((await cancelar(venda.id)).status).toBe(200);

    const repetido = await cancelar(venda.id);
    expect(repetido.status).toBe(409);
    expect((await repetido.json()).message).toBe("Esta venda já foi cancelada.");
    expect(await estoque(produtoAId)).toBe(10);
    expect(await contarDevolucoes(venda.id)).toBe(2);
    expect(await contarSaidasCancelamento(venda.id)).toBe(1);
  });

  it("dois cancelamentos simultâneos da mesma venda: só um passa e o estoque volta uma vez", async () => {
    const venda = await vender();

    const resultados = await Promise.allSettled([
      cancelarVendaBalcao(venda.id, { motivo: "Concorrente 1" }, usuarioId),
      cancelarVendaBalcao(venda.id, { motivo: "Concorrente 2" }, usuarioId),
    ]);

    expect(resultados.filter((resultado) => resultado.status === "fulfilled")).toHaveLength(1);
    const recusa = resultados.find((resultado) => resultado.status === "rejected") as PromiseRejectedResult;
    expect(recusa.reason).toMatchObject({ status: 409 });
    expect(await estoque(produtoAId)).toBe(10);
    expect(await estoque(produtoBId)).toBe(5);
    expect(await contarSaidasCancelamento(venda.id)).toBe(1);
  });

  it("sem caixa aberto recusa e não altera venda, estoque nem caixa", async () => {
    const venda = await vender();
    await prisma.caixa.update({ where: { id: caixaId }, data: { status: "FECHADO" } });

    const resposta = await cancelar(venda.id);
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Não há caixa aberto. Abra o caixa primeiro.");
    expect((await prisma.venda.findUniqueOrThrow({ where: { id: venda.id } })).status).toBe("CONCLUIDA");
    expect(await estoque(produtoAId)).toBe(8);
    expect(await contarSaidasCancelamento(venda.id)).toBe(0);
  });

  it("venda de um caixa já fechado: a saída entra no caixa aberto atual", async () => {
    const venda = await vender();
    await prisma.caixa.update({ where: { id: caixaId }, data: { status: "FECHADO" } });
    const caixaAtual = await novoCaixa();

    expect((await cancelar(venda.id)).status).toBe(200);
    const saida = await prisma.movimentacaoCaixa.findFirstOrThrow({ where: { vendaId: venda.id, origem: "CANCELAMENTO_VENDA_BALCAO" } });
    expect(saida.caixaId).toBe(caixaAtual);
  });

  it("fechamento concorrente: o cancelamento espera a trava do caixa e responde 400 sem alterar nada", async () => {
    const venda = await vender();
    let liberar!: () => void;
    const liberada = new Promise<void>((resolve) => (liberar = resolve));
    let pronta!: () => void;
    const travado = new Promise<void>((resolve) => (pronta = resolve));

    const fechamento = prisma.$transaction(async (tx) => {
      await travarCaixa(tx, caixaId);
      await tx.caixa.update({ where: { id: caixaId }, data: { status: "FECHADO" } });
      pronta();
      await liberada;
    });
    await travado;

    const resposta = cancelar(venda.id);
    const pendente = Symbol("pendente");
    expect(await Promise.race([resposta, new Promise((resolve) => setTimeout(() => resolve(pendente), 400))])).toBe(pendente);

    liberar();
    await fechamento;

    expect((await resposta).status).toBe(400);
    expect((await prisma.venda.findUniqueOrThrow({ where: { id: venda.id } })).status).toBe("CONCLUIDA");
    expect(await estoque(produtoAId)).toBe(8);
    expect(await contarSaidasCancelamento(venda.id)).toBe(0);
  });

  it("produto inativado depois da venda também volta ao estoque", async () => {
    const venda = await vender();
    await prisma.produto.update({ where: { id: produtoAId }, data: { ativo: false } });

    expect((await cancelar(venda.id)).status).toBe(200);
    expect(await estoque(produtoAId)).toBe(10);
  });

  it("falha no meio desfaz tudo: venda, estoque e caixa ficam como antes", async () => {
    const venda = await vender();
    const original = estoqueModule.devolverEstoqueProdutoVenda;
    let chamadas = 0;
    vi.spyOn(estoqueModule, "devolverEstoqueProdutoVenda").mockImplementation(async (...args) => {
      chamadas += 1;
      if (chamadas === 2) throw new Error("falha simulada");
      return original(...args);
    });

    await expect(cancelarVendaBalcao(venda.id, { motivo: "Lançado errado" }, usuarioId)).rejects.toThrow("falha simulada");
    expect(chamadas).toBe(2);
    expect((await prisma.venda.findUniqueOrThrow({ where: { id: venda.id } })).status).toBe("CONCLUIDA");
    expect(await estoque(produtoAId)).toBe(8);
    expect(await estoque(produtoBId)).toBe(4);
    expect(await contarDevolucoes(venda.id)).toBe(0);
    expect(await contarSaidasCancelamento(venda.id)).toBe(0);
  });

  it("venda inexistente devolve 404; motivo ausente ou curto devolve 400", async () => {
    expect((await cancelar("nao-existe")).status).toBe(404);

    const venda = await vender();
    expect((await cancelar(venda.id, {})).status).toBe(400);
    expect((await cancelar(venda.id, { motivo: "abc" })).status).toBe(400);
    expect((await prisma.venda.findUniqueOrThrow({ where: { id: venda.id } })).status).toBe("CONCLUIDA");
  });

  it("o banco recusa venda cancelada sem data, motivo e usuário (CHECK de consistência)", async () => {
    const venda = await vender();
    await expect(prisma.venda.update({ where: { id: venda.id }, data: { status: "CANCELADA" } })).rejects.toThrow(
      /Venda_cancelamento_consistente_check/,
    );
    await expect(
      prisma.venda.update({ where: { id: venda.id }, data: { motivoCancelamento: "Sem status" } }),
    ).rejects.toThrow(/Venda_cancelamento_consistente_check/);
  });
});
