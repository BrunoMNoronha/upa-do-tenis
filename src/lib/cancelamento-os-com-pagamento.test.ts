import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as criarOS } from "@/app/api/ordens-servico/route";
import { POST as pagarOS } from "@/app/api/ordens-servico/[id]/pagamentos/route";
import { PATCH as alterarStatus } from "@/app/api/ordens-servico/[id]/status/route";
import { abrirCaixa } from "@/lib/caixa";
import { dataOperacionalHoje } from "@/lib/date-range";
import {
  MENSAGEM_CANCELAMENTO_COM_PAGAMENTO,
  MENSAGEM_CANCELAMENTO_COM_SINAL_LEGADO,
  MENSAGEM_PAGAMENTO_OS_CANCELADA,
} from "@/lib/ordens-servico-status";
import { prisma } from "@/lib/prisma";

// #229: OS com pagamento não pode ser cancelada e OS cancelada não recebe
// pagamento. Apenas a sessão é simulada; rotas, transações e locks são reais.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
  obterUsuarioSessaoDaRequest: vi.fn().mockResolvedValue({ id: "teste-229", nome: "Teste", ativo: true }),
}));

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];

let clienteId: string;
let servicoId: string;
let formaId: string;
let caixaId: string | undefined;
let osId: string | undefined;

function request(caminho: string, method: "POST" | "PATCH", body: unknown) {
  return new NextRequest(`http://localhost/api/${caminho}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function cancelar(id: string) {
  return alterarStatus(request(`ordens-servico/${id}/status`, "PATCH", { statusNovo: "CANCELADA" }), {
    params: Promise.resolve({ id }),
  });
}

function pagar(id: string, valor: number) {
  return pagarOS(
    request(`ordens-servico/${id}/pagamentos`, "POST", {
      formaPagamentoId: formaId,
      valor,
      dataPagamento: dataOperacionalHoje(),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function cadastrar() {
  const response = await criarOS(
    request("ordens-servico", "POST", {
      clienteId,
      numeroOS: String(Date.now()),
      prazoPrevisto: dataOperacionalHoje(),
      itens: [{ tipoItem: "CALCADO", descricao: "Tênis #229", servicos: [{ servicoId, valor: 100 }] }],
    }),
  );
  expect(response.status).toBe(201);
  const criada = await response.json();
  osId = criada.id;
  return criada.id as string;
}

async function estado(id: string) {
  const [ordem, pagamentos, movimentos, historico] = await Promise.all([
    prisma.ordemServico.findUniqueOrThrow({ where: { id } }),
    prisma.pagamento.count({ where: { ordemServicoId: id } }),
    prisma.movimentacaoCaixa.count({ where: { ordemServicoId: id } }),
    prisma.historicoStatus.count({ where: { ordemServicoId: id, statusNovo: "CANCELADA" } }),
  ]);
  return { status: ordem.status, valorPago: Number(ordem.valorPago), pagamentos, movimentos, historico };
}

/** Transação que segura o lock da linha da OS até `liberar()` ser chamado. */
function segurarLock(operacao: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<unknown>) {
  let liberar!: () => void;
  const liberacao = new Promise<void>((resolver) => (liberar = resolver));
  let travado!: () => void;
  const lockObtido = new Promise<void>((resolver) => (travado = resolver));
  const transacao = prisma.$transaction(
    async (tx) => {
      await operacao(tx);
      travado();
      await liberacao;
    },
    { timeout: 20000 },
  );
  return { lockObtido, liberar, transacao };
}

const aguardar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Este teste requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  clienteId = (await prisma.cliente.create({ data: { nome: `Teste 229 ${randomUUID()}`, telefone: "11999999999" } })).id;
  servicoId = (await prisma.servico.create({ data: { nome: "Reparo #229", precoBase: 100 } })).id;
  formaId = (await prisma.formaPagamento.create({ data: { nome: "Dinheiro #229", tipo: "DINHEIRO" } })).id;
  caixaId = (await abrirCaixa({ saldoInicial: 0 })).id;
  osId = undefined;
});

afterEach(async () => {
  if (osId) {
    await prisma.movimentacaoCaixa.deleteMany({ where: { ordemServicoId: osId } });
    await prisma.ordemServico.delete({ where: { id: osId } });
  }
  if (caixaId) {
    await prisma.movimentacaoCaixa.deleteMany({ where: { caixaId } });
    await prisma.caixa.delete({ where: { id: caixaId } });
  }
  await prisma.formaPagamento.delete({ where: { id: formaId } });
  await prisma.servico.delete({ where: { id: servicoId } });
  await prisma.cliente.delete({ where: { id: clienteId } });
});

describe("cancelamento de OS com pagamento (#229)", () => {
  it("OS sem pagamento continua podendo ser cancelada", async () => {
    const id = await cadastrar();

    const resposta = await cancelar(id);

    expect(resposta.status).toBe(200);
    expect(await estado(id)).toEqual({ status: "CANCELADA", valorPago: 0, pagamentos: 0, movimentos: 0, historico: 1 });
  });

  it.each([
    ["parcial", 40],
    ["total", 100],
  ])("OS com pagamento %s: 409 e nada muda", async (_rotulo, valor) => {
    const id = await cadastrar();
    expect((await pagar(id, valor)).status).toBe(201);
    const antes = await estado(id);

    const resposta = await cancelar(id);

    expect(resposta.status).toBe(409);
    expect((await resposta.json()).message).toBe(MENSAGEM_CANCELAMENTO_COM_PAGAMENTO);
    expect(await estado(id)).toEqual(antes);
    expect(antes).toEqual({ status: "ABERTA", valorPago: valor, pagamentos: 1, movimentos: 1, historico: 0 });
  });

  it("OS com sinal legado (valorSinal > 0, sem Pagamento): 409 e nada muda", async () => {
    const id = await cadastrar();
    // Dado legado/importado: sinal gravado direto na OS, sem registro de Pagamento.
    await prisma.ordemServico.update({ where: { id }, data: { valorSinal: 30 } });

    const resposta = await cancelar(id);

    expect(resposta.status).toBe(409);
    // Sem pagamento a estornar, a mensagem não orienta estorno (#230).
    expect((await resposta.json()).message).toBe(MENSAGEM_CANCELAMENTO_COM_SINAL_LEGADO);
    expect(await estado(id)).toEqual({ status: "ABERTA", valorPago: 0, pagamentos: 0, movimentos: 0, historico: 0 });
  });

  it("OS cancelada não recebe pagamento: 409 sem pagamento nem movimentação de caixa", async () => {
    const id = await cadastrar();
    expect((await cancelar(id)).status).toBe(200);

    const resposta = await pagar(id, 10);

    expect(resposta.status).toBe(409);
    expect((await resposta.json()).message).toBe(MENSAGEM_PAGAMENTO_OS_CANCELADA);
    expect(await estado(id)).toEqual({ status: "CANCELADA", valorPago: 0, pagamentos: 0, movimentos: 0, historico: 1 });
  });

  it("corrida: pagamento grava primeiro, cancelamento espera o lock e é recusado", async () => {
    const id = await cadastrar();
    // Reproduz a gravação final de um pagamento ainda não confirmado.
    const pagamento = segurarLock(async (tx) => {
      await tx.pagamento.create({
        data: { ordemServicoId: id, formaPagamentoId: formaId, tipo: "PAGAMENTO", valor: 40, dataPagamento: new Date() },
      });
      await tx.ordemServico.updateMany({
        where: { id, status: { not: "CANCELADA" } },
        data: { valorPago: 40, saldo: 60 },
      });
    });
    await pagamento.lockObtido;

    const cancelamento = cancelar(id);
    await aguardar(500); // o cancelamento fica bloqueado no UPDATE da OS
    pagamento.liberar();
    await pagamento.transacao;
    const resposta = await cancelamento;

    expect(resposta.status).toBe(409);
    expect((await resposta.json()).message).toBe(MENSAGEM_CANCELAMENTO_COM_PAGAMENTO);
    expect(await estado(id)).toMatchObject({ status: "ABERTA", valorPago: 40, pagamentos: 1, historico: 0 });
  });

  it("corrida: cancelamento grava primeiro, pagamento espera o lock e é desfeito por inteiro", async () => {
    const id = await cadastrar();
    // Reproduz a gravação de um cancelamento ainda não confirmado.
    const cancelamento = segurarLock(async (tx) => {
      await tx.ordemServico.updateMany({
        where: { id, status: "ABERTA", valorPago: 0 },
        data: { status: "CANCELADA" },
      });
    });
    await cancelamento.lockObtido;

    const pagamento = pagar(id, 40);
    await aguardar(500); // o pagamento fica bloqueado na gravação final da OS
    cancelamento.liberar();
    await cancelamento.transacao;
    const resposta = await pagamento;

    expect(resposta.status).toBe(409);
    expect((await resposta.json()).message).toBe(MENSAGEM_PAGAMENTO_OS_CANCELADA);
    expect(await estado(id)).toMatchObject({ status: "CANCELADA", valorPago: 0, pagamentos: 0, movimentos: 0 });
  });
});
