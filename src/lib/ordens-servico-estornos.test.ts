import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as estornarAPI } from "@/app/api/ordens-servico/[id]/pagamentos/[pagamentoId]/estorno/route";
import { GET as listarPagamentosAPI, POST as pagarOS } from "@/app/api/ordens-servico/[id]/pagamentos/route";
import { POST as criarOS } from "@/app/api/ordens-servico/route";
import { GET as detalheOS } from "@/app/api/ordens-servico/[id]/route";
import { PATCH as alterarStatus } from "@/app/api/ordens-servico/[id]/status/route";
import { obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { abrirCaixa, fecharCaixa, obterDetalhesCaixa, travarCaixa } from "@/lib/caixa";
import { dataOperacionalHoje } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

// #230, fatia 2: API de estorno com saída no caixa, contra o banco real de testes.
// Apenas a sessão é simulada.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
  obterUsuarioSessaoDaRequest: vi.fn(),
}));

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];

let clienteId: string;
let servicoId: string;
let dinheiroId: string;
let pixId: string;
let usuarioId: string;
let caixaIds: string[];
let osIds: string[];

function request(caminho: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost/api/${caminho}`, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function novoCaixa() {
  const caixa = await abrirCaixa({ saldoInicial: 0 });
  caixaIds.push(caixa.id);
  return caixa.id;
}

async function cadastrar(valor = 100) {
  const resposta = await criarOS(
    request("ordens-servico", "POST", {
      clienteId,
      numeroOS: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      prazoPrevisto: dataOperacionalHoje(),
      itens: [{ tipoItem: "CALCADO", descricao: "Tênis #230 f2", servicos: [{ servicoId, valor }] }],
    }),
  );
  expect(resposta.status).toBe(201);
  const { id } = await resposta.json();
  osIds.push(id);
  return id as string;
}

async function pagar(osId: string, valor: number, formaPagamentoId: string) {
  const resposta = await pagarOS(
    request(`ordens-servico/${osId}/pagamentos`, "POST", { formaPagamentoId, valor, dataPagamento: dataOperacionalHoje() }),
    params(osId),
  );
  expect(resposta.status).toBe(201);
  return (await resposta.json()).pagamento.id as string;
}

function estornar(osId: string, pagamentoId: string, body: unknown = { motivo: "Lançado errado" }) {
  return estornarAPI(
    request(`ordens-servico/${osId}/pagamentos/${pagamentoId}/estorno`, "POST", body),
    { params: Promise.resolve({ id: osId, pagamentoId }) },
  );
}

async function resumo(osId: string) {
  const resposta = await detalheOS(request(`ordens-servico/${osId}`), params(osId));
  return (await resposta.json()).ordemServico.resumoFinanceiro;
}

async function totaisCaixa(caixaId: string) {
  return (await obterDetalhesCaixa(caixaId))!.totais;
}

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Este teste requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  caixaIds = [];
  osIds = [];
  clienteId = (await prisma.cliente.create({ data: { nome: `Teste 230f2 ${randomUUID()}`, telefone: "11999999999" } })).id;
  servicoId = (await prisma.servico.create({ data: { nome: "Reparo #230 f2", precoBase: 100 } })).id;
  dinheiroId = (await prisma.formaPagamento.create({ data: { nome: `Dinheiro 230f2 ${randomUUID()}`, tipo: "DINHEIRO" } })).id;
  pixId = (await prisma.formaPagamento.create({ data: { nome: `PIX 230f2 ${randomUUID()}`, tipo: "PIX" } })).id;
  usuarioId = (
    await prisma.usuario.create({ data: { nome: "Operador 230", email: `t230f2-${randomUUID()}@teste.local`, senhaHash: "x" } })
  ).id;
  vi.mocked(obterUsuarioSessaoDaRequest).mockResolvedValue({ id: usuarioId, nome: "Operador 230", ativo: true } as never);
});

afterEach(async () => {
  await prisma.caixa.updateMany({ where: { id: { in: caixaIds }, status: "ABERTO" }, data: { status: "FECHADO" } });
  await prisma.movimentacaoCaixa.deleteMany({ where: { OR: [{ caixaId: { in: caixaIds } }, { ordemServicoId: { in: osIds } }] } });
  await prisma.estornoPagamento.deleteMany({ where: { pagamento: { ordemServicoId: { in: osIds } } } });
  await prisma.ordemServico.deleteMany({ where: { id: { in: osIds } } });
  await prisma.caixa.deleteMany({ where: { id: { in: caixaIds } } });
  await prisma.usuario.delete({ where: { id: usuarioId } });
  await prisma.formaPagamento.deleteMany({ where: { id: { in: [dinheiroId, pixId] } } });
  await prisma.servico.delete({ where: { id: servicoId } });
  await prisma.cliente.delete({ where: { id: clienteId } });
});

describe("API de estorno de pagamento de OS (#230, fatia 2)", () => {
  it("estorno em dinheiro reduz o saldo físico; em PIX reduz só o total da forma", async () => {
    const caixaId = await novoCaixa();
    const osId = await cadastrar();
    const pagDinheiro = await pagar(osId, 40, dinheiroId);
    const pagPix = await pagar(osId, 60, pixId);
    const antes = await totaisCaixa(caixaId);

    const respostaPix = await estornar(osId, pagPix);
    expect(respostaPix.status).toBe(201);
    const aposPix = await totaisCaixa(caixaId);
    expect(aposPix.saldoFisicoCalculado).toBe(antes.saldoFisicoCalculado);
    expect(aposPix.totalGeralRecebido).toBe(antes.totalGeralRecebido - 60);

    expect((await estornar(osId, pagDinheiro)).status).toBe(201);
    const aposDinheiro = await totaisCaixa(caixaId);
    expect(aposDinheiro.saldoFisicoCalculado).toBe(antes.saldoFisicoCalculado - 40);

    const saidas = await prisma.movimentacaoCaixa.findMany({
      where: { caixaId, origem: "ESTORNO_PAGAMENTO_OS" },
      include: { estornoPagamento: true },
    });
    expect(saidas).toHaveLength(2);
    for (const saida of saidas) {
      expect(saida).toMatchObject({ tipo: "SAIDA", ordemServicoId: osId });
      expect(saida.estornoPagamento?.usuarioId).toBe(usuarioId);
    }
  });

  it("OS 100 com 40 + 60: estornos devolvem saldo e status; depois o cancelamento funciona", async () => {
    await novoCaixa();
    const osId = await cadastrar();
    const pag40 = await pagar(osId, 40, pixId);
    const pag60 = await pagar(osId, 60, pixId);

    const resposta = await estornar(osId, pag60, { motivo: "  Cliente desistiu  " });
    expect(resposta.status).toBe(201);
    expect((await resposta.json()).resumoFinanceiro).toMatchObject({ valorPago: 40, saldo: 60, statusFinanceiro: "PARCIAL" });
    expect(await resumo(osId)).toMatchObject({ valorPago: 40, saldo: 60, statusFinanceiro: "PARCIAL" });
    const coluna = await prisma.ordemServico.findUniqueOrThrow({ where: { id: osId } });
    expect(Number(coluna.valorPago)).toBe(40);
    expect(Number(coluna.saldo)).toBe(60);

    expect((await estornar(osId, pag40)).status).toBe(201);
    expect(await resumo(osId)).toMatchObject({ valorPago: 0, saldo: 100, statusFinanceiro: "PENDENTE" });

    const cancelamento = await alterarStatus(
      request(`ordens-servico/${osId}/status`, "PATCH", { statusNovo: "CANCELADA" }),
      params(osId),
    );
    expect(cancelamento.status).toBe(200);

    const lista = await (await listarPagamentosAPI(request(`ordens-servico/${osId}/pagamentos`), params(osId))).json();
    const estornado60 = lista.pagamentos.find((p: { id: string }) => p.id === pag60);
    expect(estornado60.estorno).toMatchObject({ motivo: "Cliente desistiu", valor: 60, usuario: { nome: "Operador 230" } });

    // O detalhe da OS (usado pela tela, fatia 4) traz o estorno para exibir no histórico.
    const detalhe = await (await detalheOS(request(`ordens-servico/${osId}`), params(osId))).json();
    const noDetalhe = detalhe.ordemServico.pagamentos.find((p: { id: string }) => p.id === pag60);
    expect(noDetalhe.estorno).toMatchObject({ motivo: "Cliente desistiu", usuario: { nome: "Operador 230" } });
    expect(noDetalhe.estorno.dataEstorno).toEqual(expect.any(String));
    const ativoNoDetalhe = detalhe.ordemServico.pagamentos.find((p: { id: string }) => p.id === pag40);
    expect(ativoNoDetalhe.estorno).toMatchObject({ motivo: expect.any(String) });
  });

  it("segundo estorno do mesmo pagamento é recusado; simultâneos geram exatamente um estorno e uma saída", async () => {
    await novoCaixa();
    const osId = await cadastrar();
    const pagA = await pagar(osId, 40, pixId);
    const pagB = await pagar(osId, 60, pixId);

    expect((await estornar(osId, pagA)).status).toBe(201);
    const repetido = await estornar(osId, pagA);
    expect(repetido.status).toBe(409);

    const respostas = await Promise.all([estornar(osId, pagB), estornar(osId, pagB)]);
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.estornoPagamento.count({ where: { pagamentoId: pagB } })).toBe(1);
    expect(
      await prisma.movimentacaoCaixa.count({ where: { ordemServicoId: osId, origem: "ESTORNO_PAGAMENTO_OS" } }),
    ).toBe(2);
    expect(await resumo(osId)).toMatchObject({ valorPago: 0, saldo: 100 });
  });

  it("recusas não gravam nada: sem caixa, motivo inválido, OS cancelada, pagamento de outra OS", async () => {
    const caixaId = await novoCaixa();
    const osId = await cadastrar();
    const outraOsId = await cadastrar();
    const pagamentoId = await pagar(osId, 40, pixId);

    expect((await estornar(osId, pagamentoId, { motivo: "   " })).status).toBe(400);
    expect((await estornar(osId, pagamentoId, { motivo: "abc" })).status).toBe(400);
    expect((await estornar(osId, pagamentoId, { motivo: "x".repeat(501) })).status).toBe(400);
    expect((await estornar(osId, pagamentoId, {})).status).toBe(400);
    expect((await estornar(outraOsId, pagamentoId)).status).toBe(404);
    expect((await estornar(osId, "inexistente")).status).toBe(404);

    await fecharCaixa(caixaId, { saldoFinalInformado: 0 });
    const semCaixa = await estornar(osId, pagamentoId);
    expect(semCaixa.status).toBe(400);
    expect((await semCaixa.json()).message).toBe("Não há caixa aberto. Abra o caixa primeiro.");

    // OS cancelada por fora (a rota de status bloquearia com pagamento ativo).
    await novoCaixa();
    await prisma.ordemServico.update({ where: { id: osId }, data: { status: "CANCELADA" } });
    expect((await estornar(osId, pagamentoId)).status).toBe(409);

    expect(await prisma.estornoPagamento.count({ where: { pagamentoId } })).toBe(0);
    expect(await prisma.movimentacaoCaixa.count({ where: { origem: "ESTORNO_PAGAMENTO_OS", ordemServicoId: osId } })).toBe(0);
  });

  it("pagamento recebido em caixa já fechado: a saída entra no caixa aberto atual e o antigo fica intacto", async () => {
    const caixaAntigo = await novoCaixa();
    const osId = await cadastrar();
    const pagamentoId = await pagar(osId, 50, dinheiroId);
    await fecharCaixa(caixaAntigo, { saldoFinalInformado: 50 });
    const antigoAntes = await obterDetalhesCaixa(caixaAntigo);

    const caixaAtual = await novoCaixa();
    expect((await estornar(osId, pagamentoId)).status).toBe(201);

    const antigoDepois = await obterDetalhesCaixa(caixaAntigo);
    expect(antigoDepois!.movimentacoes).toHaveLength(antigoAntes!.movimentacoes.length);
    expect(antigoDepois!.totais).toEqual(antigoAntes!.totais);
    expect((await totaisCaixa(caixaAtual)).saldoFisicoCalculado).toBe(-50);
  });

  it("fechamento concorrente: a API de pagamento espera a trava do caixa e responde 400 sem gravar", async () => {
    const caixaId = await novoCaixa();
    const osId = await cadastrar();
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

    const resposta = pagarOS(
      request(`ordens-servico/${osId}/pagamentos`, "POST", { formaPagamentoId: pixId, valor: 40, dataPagamento: dataOperacionalHoje() }),
      params(osId),
    );
    const pendente = Symbol("pendente");
    expect(await Promise.race([resposta, new Promise((resolve) => setTimeout(() => resolve(pendente), 400))])).toBe(pendente);

    liberar();
    await fechamento;

    expect((await resposta).status).toBe(400);
    expect((await (await resposta).json()).message).toBe("Não é possível movimentar um caixa fechado.");
    expect(await prisma.pagamento.count({ where: { ordemServicoId: osId } })).toBe(0);
    expect(await resumo(osId)).toMatchObject({ valorPago: 0, saldo: 100 });
  });

  it("pagamento e estorno simultâneos na mesma OS não entram em deadlock (OS antes do caixa nos dois)", async () => {
    await novoCaixa();
    const osId = await cadastrar(300);

    for (let rodada = 0; rodada < 5; rodada += 1) {
      const pagamentoId = await pagar(osId, 20, dinheiroId);
      const [estorno, pagamento] = await Promise.all([
        estornar(osId, pagamentoId),
        pagarOS(
          request(`ordens-servico/${osId}/pagamentos`, "POST", {
            formaPagamentoId: pixId,
            valor: 10,
            dataPagamento: dataOperacionalHoje(),
          }),
          params(osId),
        ),
      ]);
      expect([estorno.status, pagamento.status]).toEqual([201, 201]);
    }

    // 5 pagamentos de 20 estornados + 5 de 10 ativos.
    expect(await resumo(osId)).toMatchObject({ valorPago: 50, saldo: 250 });
    expect(await prisma.movimentacaoCaixa.count({ where: { ordemServicoId: osId } })).toBe(15);
  });
});
