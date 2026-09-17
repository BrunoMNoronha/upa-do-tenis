import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as pagarOS } from "@/app/api/ordens-servico/[id]/pagamentos/route";
import { GET as detalheOS } from "@/app/api/ordens-servico/[id]/route";
import { POST as criarOS } from "@/app/api/ordens-servico/route";
import { abrirCaixa } from "@/lib/caixa";
import { getDashboardMetrics } from "@/lib/dashboard-service";
import { dataOperacional, dataOperacionalHoje } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";
import { gerarRelatorioFinanceiroOS } from "@/lib/relatorio-financeiro-os-service";

// #230, fatia 3: dashboard com recebido líquido (estorno descontado no dia do
// estorno) e relatório financeiro coerente com o detalhe da OS, no banco real.
// O estorno é gravado direto no banco; a API é da fatia 2.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
  obterUsuarioSessaoDaRequest: vi.fn().mockResolvedValue({ id: "teste-230f3", nome: "Teste", ativo: true }),
}));

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];
// Dias antigos, longe dos dados de outros testes; comparações por diferença.
const DIA_PAGAMENTO = "2020-03-10";
const DIA_ESTORNO = "2020-03-12";

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

function valorDoDia(metrics: Awaited<ReturnType<typeof getDashboardMetrics>>, dia: string) {
  return metrics.recebimentosPorDia!.find((item) => item.dia === dia)!.valor;
}

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Este teste requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  clienteId = (await prisma.cliente.create({ data: { nome: `Teste 230f3 ${randomUUID()}`, telefone: "11999999999" } })).id;
  servicoId = (await prisma.servico.create({ data: { nome: "Reparo #230 f3", precoBase: 100 } })).id;
  formaId = (await prisma.formaPagamento.create({ data: { nome: `PIX 230f3 ${randomUUID()}`, tipo: "PIX" } })).id;
  usuarioId = (
    await prisma.usuario.create({ data: { nome: "Teste 230f3", email: `t230f3-${randomUUID()}@teste.local`, senhaHash: "x" } })
  ).id;
  caixaId = (await abrirCaixa({ saldoInicial: 0 })).id;
  osId = undefined;
});

afterEach(async () => {
  await prisma.movimentacaoCaixa.deleteMany({ where: { caixaId } });
  if (osId) {
    await prisma.estornoPagamento.deleteMany({ where: { pagamento: { ordemServicoId: osId } } });
    await prisma.ordemServico.delete({ where: { id: osId } });
  }
  await prisma.caixa.delete({ where: { id: caixaId } });
  await prisma.usuario.delete({ where: { id: usuarioId } });
  await prisma.formaPagamento.delete({ where: { id: formaId } });
  await prisma.servico.delete({ where: { id: servicoId } });
  await prisma.cliente.delete({ where: { id: clienteId } });
});

describe("dashboard e relatórios com estorno (#230, fatia 3)", () => {
  it("pagamento no dia 10 e estorno às 22:30 do dia 12: dia 10 = +100, dia 12 = −100, período = 0", async () => {
    const antesPeriodo = await getDashboardMetrics(DIA_PAGAMENTO, DIA_ESTORNO);
    const antesDia10 = await getDashboardMetrics(DIA_PAGAMENTO, DIA_PAGAMENTO);

    const resposta = await criarOS(
      request("ordens-servico", "POST", {
        clienteId,
        numeroOS: `${Date.now()}`,
        prazoPrevisto: dataOperacionalHoje(),
        itens: [{ tipoItem: "CALCADO", descricao: "Tênis #230 f3", servicos: [{ servicoId, valor: 100 }] }],
      }),
    );
    expect(resposta.status).toBe(201);
    osId = (await resposta.json()).id as string;

    const pagamento = await pagarOS(
      request(`ordens-servico/${osId}/pagamentos`, "POST", { formaPagamentoId: formaId, valor: 100, dataPagamento: DIA_PAGAMENTO }),
      params(osId),
    );
    expect(pagamento.status).toBe(201);
    const pagamentoId = (await pagamento.json()).pagamento.id as string;

    const comPagamento = await getDashboardMetrics(DIA_PAGAMENTO, DIA_PAGAMENTO);
    expect(comPagamento.totalRecebido - antesDia10.totalRecebido).toBe(100);

    const dataEstorno = new Date(`${DIA_ESTORNO}T22:30:00-03:00`);
    expect(dataOperacional(dataEstorno)).toBe(DIA_ESTORNO);
    await prisma.estornoPagamento.create({
      data: { pagamentoId, valor: 100, motivo: "Lançado errado", usuarioId, dataEstorno },
    });
    await prisma.ordemServico.update({ where: { id: osId }, data: { valorPago: 0, saldo: 100 } });

    const periodo = await getDashboardMetrics(DIA_PAGAMENTO, DIA_ESTORNO);
    expect(periodo.totalRecebido - antesPeriodo.totalRecebido).toBe(0);
    expect(valorDoDia(periodo, DIA_PAGAMENTO) - valorDoDia(antesPeriodo, DIA_PAGAMENTO)).toBe(100);
    expect(valorDoDia(periodo, DIA_ESTORNO) - valorDoDia(antesPeriodo, DIA_ESTORNO)).toBe(-100);
    const somaSerie = periodo.recebimentosPorDia!.reduce((acc, item) => acc + item.valor, 0);
    expect(somaSerie).toBeCloseTo(periodo.totalRecebido, 2);

    // O dia do pagamento, visto sozinho, não muda depois do estorno.
    const dia10Depois = await getDashboardMetrics(DIA_PAGAMENTO, DIA_PAGAMENTO);
    expect(dia10Depois.totalRecebido).toBe(comPagamento.totalRecebido);

    // Relatório financeiro coerente com o detalhe da OS.
    const detalhe = (await (await detalheOS(request(`ordens-servico/${osId}`), params(osId))).json()).ordemServico
      .resumoFinanceiro;
    expect(detalhe).toMatchObject({ valorPago: 0, saldo: 100, statusFinanceiro: "PENDENTE" });
    const { dataEntrada } = await prisma.ordemServico.findUniqueOrThrow({ where: { id: osId } });
    const dia = dataOperacional(dataEntrada);
    const relatorio = await gerarRelatorioFinanceiroOS({ inicio: dia, fim: dia });
    expect(relatorio.itens.find((item) => item.id === osId)).toMatchObject({
      valorPago: detalhe.valorPago,
      saldo: detalhe.saldo,
    });
  });
});
