import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as criarOS } from "@/app/api/ordens-servico/route";
import { GET as detalheOS } from "@/app/api/ordens-servico/[id]/route";
import { POST as pagarOS } from "@/app/api/ordens-servico/[id]/pagamentos/route";
import { PATCH as alterarStatus } from "@/app/api/ordens-servico/[id]/status/route";
import { abrirCaixa } from "@/lib/caixa";
import { dataOperacional, dataOperacionalHoje } from "@/lib/date-range";
import { INCLUDE_ESTORNO_PAGAMENTO, calcularResumoFinanceiroOS } from "@/lib/ordens-servico-financeiro";
import { prisma } from "@/lib/prisma";
import { gerarRelatorioFinanceiroOS } from "@/lib/relatorio-financeiro-os-service";

// #230, fatia 1: o modelo de estorno existe e toda leitura financeira da OS
// desconsidera pagamentos estornados. A API de estorno é da fatia 2; aqui o
// estorno é gravado direto no banco, recalculando valorPago/saldo como a
// fatia 2 fará. Apenas a sessão é simulada.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
  obterUsuarioSessaoDaRequest: vi.fn().mockResolvedValue({ id: "teste-230", nome: "Teste", ativo: true }),
}));

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];

let clienteId: string;
let servicoId: string;
let formaId: string;
let usuarioId: string;
let caixaId: string;
let osId: string | undefined;

function request(caminho: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost/api/${caminho}`, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function cadastrar() {
  const resposta = await criarOS(
    request("ordens-servico", "POST", {
      clienteId,
      numeroOS: String(Date.now()),
      prazoPrevisto: dataOperacionalHoje(),
      itens: [{ tipoItem: "CALCADO", descricao: "Tênis #230", servicos: [{ servicoId, valor: 100 }] }],
    }),
  );
  expect(resposta.status).toBe(201);
  osId = (await resposta.json()).id;
  return osId!;
}

async function pagar(id: string, valor: number) {
  return pagarOS(
    request(`ordens-servico/${id}/pagamentos`, "POST", {
      formaPagamentoId: formaId,
      valor,
      dataPagamento: dataOperacionalHoje(),
    }),
    params(id),
  );
}

/** Grava o estorno e recalcula a OS como a API da fatia 2 fará. */
async function estornar(pagamentoId: string) {
  await prisma.$transaction(async (tx) => {
    const pagamento = await tx.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
    await tx.estornoPagamento.create({
      data: { pagamentoId, valor: pagamento.valor, motivo: "Lançado errado", usuarioId },
    });
    const ordem = await tx.ordemServico.findUniqueOrThrow({
      where: { id: pagamento.ordemServicoId },
      include: { pagamentos: { include: INCLUDE_ESTORNO_PAGAMENTO }, itens: { include: { servicos: { include: { servico: true } } } } },
    });
    const resumo = calcularResumoFinanceiroOS({
      statusOperacional: ordem.status,
      valorTotal: ordem.valorTotal,
      valorDesconto: ordem.valorDesconto,
      valorSinal: ordem.valorSinal,
      valorPago: ordem.valorPago,
      pagamentos: ordem.pagamentos,
      itens: ordem.itens,
    });
    await tx.ordemServico.update({ where: { id: ordem.id }, data: { valorPago: resumo.valorPago, saldo: resumo.saldo } });
  });
}

async function resumoDetalhe(id: string) {
  const resposta = await detalheOS(request(`ordens-servico/${id}`), params(id));
  expect(resposta.status).toBe(200);
  return (await resposta.json()).ordemServico.resumoFinanceiro;
}

async function linhaRelatorio(id: string) {
  const { dataEntrada } = await prisma.ordemServico.findUniqueOrThrow({ where: { id } });
  const dia = dataOperacional(dataEntrada);
  const relatorio = await gerarRelatorioFinanceiroOS({ inicio: dia, fim: dia });
  return relatorio.itens.find((item) => item.id === id);
}

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Este teste requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  clienteId = (await prisma.cliente.create({ data: { nome: `Teste 230 ${randomUUID()}`, telefone: "11999999999" } })).id;
  servicoId = (await prisma.servico.create({ data: { nome: "Reparo #230", precoBase: 100 } })).id;
  formaId = (await prisma.formaPagamento.create({ data: { nome: "PIX #230", tipo: "PIX" } })).id;
  usuarioId = (
    await prisma.usuario.create({ data: { nome: "Teste 230", email: `t230-${randomUUID()}@teste.local`, senhaHash: "x" } })
  ).id;
  caixaId = (await abrirCaixa({ saldoInicial: 0 })).id;
  osId = undefined;
});

afterEach(async () => {
  if (osId) {
    await prisma.movimentacaoCaixa.deleteMany({ where: { ordemServicoId: osId } });
    await prisma.estornoPagamento.deleteMany({ where: { pagamento: { ordemServicoId: osId } } });
    await prisma.ordemServico.delete({ where: { id: osId } });
  }
  await prisma.movimentacaoCaixa.deleteMany({ where: { caixaId } });
  await prisma.caixa.delete({ where: { id: caixaId } });
  await prisma.usuario.delete({ where: { id: usuarioId } });
  await prisma.formaPagamento.delete({ where: { id: formaId } });
  await prisma.servico.delete({ where: { id: servicoId } });
  await prisma.cliente.delete({ where: { id: clienteId } });
});

describe("estorno de pagamento — modelo e cálculo (#230, fatia 1)", () => {
  it("um pagamento aceita no máximo um estorno (restrição única no banco)", async () => {
    const id = await cadastrar();
    expect((await pagar(id, 40)).status).toBe(201);
    const { id: pagamentoId } = await prisma.pagamento.findFirstOrThrow({ where: { ordemServicoId: id } });

    await estornar(pagamentoId);

    await expect(
      prisma.estornoPagamento.create({ data: { pagamentoId, valor: 40, motivo: "De novo", usuarioId } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("estorno reflete no detalhe, no relatório e na validação de saldo do próximo pagamento", async () => {
    const id = await cadastrar();
    expect((await pagar(id, 40)).status).toBe(201);
    expect((await pagar(id, 60)).status).toBe(201);
    expect(await resumoDetalhe(id)).toMatchObject({ valorPago: 100, saldo: 0, statusFinanceiro: "PAGO" });

    const pagamento60 = await prisma.pagamento.findFirstOrThrow({ where: { ordemServicoId: id, valor: 60 } });
    await estornar(pagamento60.id);

    expect(await resumoDetalhe(id)).toMatchObject({ valorPago: 40, saldo: 60, statusFinanceiro: "PARCIAL" });
    expect(await linhaRelatorio(id)).toMatchObject({ valorTotal: 100, valorPago: 40, saldo: 60 });

    // Sem o estorno no cálculo, o saldo seria 0 e este pagamento seria recusado.
    expect((await pagar(id, 60)).status).toBe(201);
    expect(await resumoDetalhe(id)).toMatchObject({ valorPago: 100, saldo: 0, statusFinanceiro: "PAGO" });
  });

  it("cancelamento: bloqueado com um pagamento ativo, liberado com todos estornados", async () => {
    const id = await cadastrar();
    expect((await pagar(id, 40)).status).toBe(201);
    expect((await pagar(id, 60)).status).toBe(201);
    const [primeiro, segundo] = await prisma.pagamento.findMany({ where: { ordemServicoId: id }, orderBy: { valor: "asc" } });

    await estornar(segundo.id);
    const bloqueado = await alterarStatus(request(`ordens-servico/${id}/status`, "PATCH", { statusNovo: "CANCELADA" }), params(id));
    expect(bloqueado.status).toBe(409);

    await estornar(primeiro.id);
    expect(await resumoDetalhe(id)).toMatchObject({ valorPago: 0, saldo: 100, statusFinanceiro: "PENDENTE" });
    const liberado = await alterarStatus(request(`ordens-servico/${id}/status`, "PATCH", { statusNovo: "CANCELADA" }), params(id));
    expect(liberado.status).toBe(200);
  });
});
