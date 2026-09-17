import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as estornarAPI } from "@/app/api/atendimentos-rapidos/[id]/estorno/route";
import { obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { listarAtendimentosRapidosPaginado, registrarAtendimentoRapido } from "@/lib/atendimento-rapido";
import { estornarAtendimentoRapido } from "@/lib/atendimento-rapido-estorno";
import { registrarAtendimentoRapidoSchema } from "@/lib/atendimento-rapido-schema";
import * as caixaModule from "@/lib/caixa";
import { getDashboardMetrics } from "@/lib/dashboard-service";
import { dataOperacional } from "@/lib/date-range";
import { normalizarPaginacao } from "@/lib/paginacao";
import { prisma } from "@/lib/prisma";

// Estorno total de Atendimento Rápido, contra o banco real de testes.
// Apenas a sessão é simulada.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
  obterUsuarioSessaoDaRequest: vi.fn(),
}));

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];
const hoje = () => dataOperacional(new Date());

let servicoId: string;
let dinheiroId: string;
let pixId: string;
let usuarioId: string;
let caixaId: string;
let atendimentoIds: string[];

async function registrar(pagamentos: { formaPagamentoId: string; valor: string }[]) {
  const total = pagamentos.reduce((soma, pagamento) => soma + Number(pagamento.valor), 0).toFixed(2);
  const { atendimento } = await registrarAtendimentoRapido(
    registrarAtendimentoRapidoSchema.parse({
      chaveIdempotencia: randomUUID(),
      itens: [{ servicoId, valor: total }],
      pagamentos,
    }),
    { usuarioId },
  );
  atendimentoIds.push(atendimento.id);
  return atendimento;
}

function estornar(id: string, body: unknown = { motivo: "Lançado errado" }) {
  return estornarAPI(
    new NextRequest(`http://localhost/api/atendimentos-rapidos/${id}/estorno`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function totaisCaixa() {
  return (await caixaModule.obterDetalhesCaixa(caixaId))!.totais;
}

function contarEstornos(atendimentoRapidoId: string) {
  return prisma.estornoPagamento.count({ where: { pagamento: { atendimentoRapidoId } } });
}

function contarSaidas(atendimentoRapidoId: string) {
  return prisma.movimentacaoCaixa.count({ where: { origem: "ESTORNO_ATENDIMENTO_RAPIDO", atendimentoRapidoId } });
}

async function linhaDaListagem(id: string) {
  const listagem = await listarAtendimentosRapidosPaginado({ paginacao: normalizarPaginacao({}) });
  return listagem.data.find((item) => item.id === id);
}

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Este teste requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  atendimentoIds = [];
  servicoId = (await prisma.servico.create({ data: { nome: `Higienização estorno AR ${randomUUID()}`, precoBase: 50 } })).id;
  dinheiroId = (await prisma.formaPagamento.create({ data: { nome: `Dinheiro estorno AR ${randomUUID()}`, tipo: "DINHEIRO" } })).id;
  pixId = (await prisma.formaPagamento.create({ data: { nome: `PIX estorno AR ${randomUUID()}`, tipo: "PIX" } })).id;
  usuarioId = (
    await prisma.usuario.create({
      data: { nome: "Operador estorno AR", email: `estorno-ar-${randomUUID()}@teste.local`, senhaHash: "x" },
    })
  ).id;
  vi.mocked(obterUsuarioSessaoDaRequest).mockResolvedValue({ id: usuarioId, nome: "Operador estorno AR", ativo: true } as never);
  await prisma.caixa.updateMany({ where: { status: "ABERTO" }, data: { status: "FECHADO" } });
  caixaId = (await prisma.caixa.create({ data: { saldoInicial: 100, status: "ABERTO" } })).id;
});

afterEach(async () => {
  vi.restoreAllMocks();
  // Ordem das FKs: movimentação -> estorno -> pagamento -> itens -> atendimento -> caixa.
  await prisma.movimentacaoCaixa.deleteMany({ where: { OR: [{ caixaId }, { atendimentoRapidoId: { in: atendimentoIds } }] } });
  await prisma.estornoPagamento.deleteMany({ where: { pagamento: { atendimentoRapidoId: { in: atendimentoIds } } } });
  await prisma.pagamento.deleteMany({ where: { atendimentoRapidoId: { in: atendimentoIds } } });
  await prisma.itemAtendimentoRapido.deleteMany({ where: { atendimentoRapidoId: { in: atendimentoIds } } });
  await prisma.atendimentoRapido.deleteMany({ where: { id: { in: atendimentoIds } } });
  await prisma.caixa.deleteMany({ where: { id: caixaId } });
  await prisma.usuario.delete({ where: { id: usuarioId } });
  await prisma.formaPagamento.deleteMany({ where: { id: { in: [dinheiroId, pixId] } } });
  await prisma.servico.delete({ where: { id: servicoId } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("API de estorno de Atendimento Rápido", () => {
  it("estorna todos os pagamentos de uma vez, com uma saída no caixa por forma", async () => {
    const atendimento = await registrar([
      { formaPagamentoId: dinheiroId, valor: "40.00" },
      { formaPagamentoId: pixId, valor: "60.00" },
    ]);
    const antes = await totaisCaixa();

    const resposta = await estornar(atendimento.id, { motivo: "  Serviço lançado em duplicidade  " });
    expect(resposta.status).toBe(201);
    const corpo = await resposta.json();
    expect(corpo.codigo).toBe(atendimento.codigo);
    expect(corpo.estornos).toHaveLength(2);

    const estornos = await prisma.estornoPagamento.findMany({
      where: { pagamento: { atendimentoRapidoId: atendimento.id } },
      include: { movimentacaoCaixa: true },
    });
    expect(estornos).toHaveLength(2);
    for (const estorno of estornos) {
      expect(estorno.motivo).toBe("Serviço lançado em duplicidade");
      expect(estorno.usuarioId).toBe(usuarioId);
      expect(estorno.movimentacaoCaixa).toMatchObject({
        caixaId,
        tipo: "SAIDA",
        origem: "ESTORNO_ATENDIMENTO_RAPIDO",
        atendimentoRapidoId: atendimento.id,
        ordemServicoId: null,
        pagamentoId: null,
        descricao: `Estorno do atendimento rápido ${atendimento.codigo}`,
      });
    }
    const saidaPorForma = Object.fromEntries(
      estornos.map((estorno) => [estorno.movimentacaoCaixa!.formaPagamentoId, estorno.movimentacaoCaixa!.valor.toString()]),
    );
    expect(saidaPorForma).toEqual({ [dinheiroId]: "40", [pixId]: "60" });

    // Dinheiro sai do saldo físico; o total recebido perde o valor inteiro do atendimento.
    const depois = await totaisCaixa();
    expect(depois.saldoFisicoCalculado).toBeCloseTo(antes.saldoFisicoCalculado - 40, 2);
    expect(depois.totalGeralRecebido).toBeCloseTo(antes.totalGeralRecebido - 100, 2);

    // O atendimento continua no histórico, marcado como estornado.
    expect(await prisma.atendimentoRapido.count({ where: { id: atendimento.id } })).toBe(1);
    const linha = await linhaDaListagem(atendimento.id);
    expect(linha?.estorno).toMatchObject({ motivo: "Serviço lançado em duplicidade" });
    expect(linha?.pagamentos).toHaveLength(2);
  });

  it("atendimento não estornado aparece na listagem sem estorno", async () => {
    const atendimento = await registrar([{ formaPagamentoId: pixId, valor: "50.00" }]);
    expect((await linhaDaListagem(atendimento.id))?.estorno).toBeNull();
  });

  it("recusa estornar de novo o mesmo atendimento sem lançar nada", async () => {
    const atendimento = await registrar([{ formaPagamentoId: dinheiroId, valor: "50.00" }]);
    expect((await estornar(atendimento.id)).status).toBe(201);

    const repetido = await estornar(atendimento.id);
    expect(repetido.status).toBe(409);
    expect((await repetido.json()).message).toBe("Este atendimento já foi estornado.");
    expect(await contarSaidas(atendimento.id)).toBe(1);
  });

  it("dois estornos simultâneos do mesmo atendimento: só um passa", async () => {
    const atendimento = await registrar([
      { formaPagamentoId: dinheiroId, valor: "30.00" },
      { formaPagamentoId: pixId, valor: "20.00" },
    ]);

    const resultados = await Promise.allSettled([
      estornarAtendimentoRapido(atendimento.id, { motivo: "Concorrente 1" }, usuarioId),
      estornarAtendimentoRapido(atendimento.id, { motivo: "Concorrente 2" }, usuarioId),
    ]);

    expect(resultados.filter((resultado) => resultado.status === "fulfilled")).toHaveLength(1);
    const recusa = resultados.find((resultado) => resultado.status === "rejected") as PromiseRejectedResult;
    expect(recusa.reason).toMatchObject({ status: 409 });
    expect(await contarEstornos(atendimento.id)).toBe(2);
    expect(await contarSaidas(atendimento.id)).toBe(2);
  });

  it("sem caixa aberto recusa e não grava estorno", async () => {
    const atendimento = await registrar([{ formaPagamentoId: dinheiroId, valor: "50.00" }]);
    await prisma.caixa.update({ where: { id: caixaId }, data: { status: "FECHADO" } });

    const resposta = await estornar(atendimento.id);
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toBe("Não há caixa aberto. Abra o caixa primeiro.");
    expect(await contarEstornos(atendimento.id)).toBe(0);
  });

  it("falha no meio desfaz todos os estornos do atendimento", async () => {
    const atendimento = await registrar([
      { formaPagamentoId: dinheiroId, valor: "30.00" },
      { formaPagamentoId: pixId, valor: "20.00" },
    ]);
    const original = caixaModule.registrarMovimentacaoAutomaticaCaixa;
    let chamadas = 0;
    vi.spyOn(caixaModule, "registrarMovimentacaoAutomaticaCaixa").mockImplementation(async (...args) => {
      chamadas += 1;
      if (chamadas === 2) throw new Error("falha simulada");
      return original(...args);
    });

    await expect(estornarAtendimentoRapido(atendimento.id, { motivo: "Lançado errado" }, usuarioId)).rejects.toThrow(
      "falha simulada",
    );
    expect(chamadas).toBe(2);
    expect(await contarEstornos(atendimento.id)).toBe(0);
    expect(await contarSaidas(atendimento.id)).toBe(0);
  });

  it("fechamento concorrente: a API espera a trava do caixa e responde 400 sem gravar estorno", async () => {
    const atendimento = await registrar([{ formaPagamentoId: dinheiroId, valor: "50.00" }]);
    let liberar!: () => void;
    const liberada = new Promise<void>((resolve) => (liberar = resolve));
    let pronta!: () => void;
    const travado = new Promise<void>((resolve) => (pronta = resolve));

    const fechamento = prisma.$transaction(async (tx) => {
      await caixaModule.travarCaixa(tx, caixaId);
      await tx.caixa.update({ where: { id: caixaId }, data: { status: "FECHADO" } });
      pronta();
      await liberada;
    });
    await travado;

    const resposta = estornar(atendimento.id);
    const pendente = Symbol("pendente");
    expect(await Promise.race([resposta, new Promise((resolve) => setTimeout(() => resolve(pendente), 400))])).toBe(pendente);

    liberar();
    await fechamento;

    expect((await resposta).status).toBe(400);
    expect((await (await resposta).json()).message).toBe("Não é possível movimentar um caixa fechado.");
    expect(await contarEstornos(atendimento.id)).toBe(0);
    expect(await contarSaidas(atendimento.id)).toBe(0);
  });

  it("atendimento inexistente devolve 404", async () => {
    expect((await estornar("nao-existe")).status).toBe(404);
  });

  it("motivo ausente ou curto devolve 400", async () => {
    const atendimento = await registrar([{ formaPagamentoId: pixId, valor: "50.00" }]);
    expect((await estornar(atendimento.id, {})).status).toBe(400);
    expect((await estornar(atendimento.id, { motivo: "abc" })).status).toBe(400);
    expect(await contarEstornos(atendimento.id)).toBe(0);
  });

  it("dashboard: recebido líquido desconta o estorno e o atendimento estornado sai do ranking", async () => {
    const dia = hoje();
    const antes = await getDashboardMetrics(dia, dia);
    const execucoes = (metricas: typeof antes) =>
      metricas.topServicos.find((servico) => servico.id === servicoId)?.quantidade ?? 0;

    const estornado = await registrar([{ formaPagamentoId: pixId, valor: "70.00" }]);
    await registrar([{ formaPagamentoId: dinheiroId, valor: "30.00" }]);

    const comAmbos = await getDashboardMetrics(dia, dia);
    expect(comAmbos.totalRecebido - antes.totalRecebido).toBeCloseTo(100, 2);
    expect(execucoes(comAmbos)).toBe(2);

    expect((await estornar(estornado.id)).status).toBe(201);

    const depois = await getDashboardMetrics(dia, dia);
    expect(depois.totalRecebido - antes.totalRecebido).toBeCloseTo(30, 2);
    expect(execucoes(depois)).toBe(1);
  });
});
