import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as criarOS } from "@/app/api/ordens-servico/route";
import { GET as detalheOS } from "@/app/api/ordens-servico/[id]/route";
import { POST as pagarOS } from "@/app/api/ordens-servico/[id]/pagamentos/route";
import { GET as carregarFoto } from "@/app/api/ordens-servico/[id]/itens/[itemId]/fotos/[fotoId]/route";
import { abrirCaixa, obterDetalhesCaixa } from "@/lib/caixa";
import { gerarRelatorioFinanceiroOS } from "@/lib/relatorio-financeiro-os-service";
import { dataOperacionalHoje, formatarDataLocal } from "@/lib/date-range";

// Apenas a sessão é simulada. Rotas, consultas, transações e cálculos são reais.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
  obterUsuarioSessaoDaRequest: vi.fn().mockResolvedValue({ id: "regressao", nome: "Teste", ativo: true }),
}));
// O storage externo não faz parte do banco de testes. A consulta/vinculação
// da foto é real; somente os bytes devolvidos pelo Blob são simulados.
vi.mock("@vercel/blob", () => ({
  get: vi.fn(async () => ({
    statusCode: 200,
    stream: new Response(new Uint8Array([1, 2, 3])).body,
    blob: { contentType: "image/webp", size: 3, etag: "regressao" },
  })),
}));

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];

let clienteId: string;
let servicoId: string;
let formaId: string;
let caixaId: string | undefined;
let osId: string | undefined;

function request(caminho: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/${caminho}`, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  // Somente bancos descartáveis: o de testes local e o efêmero da CI.
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Esta regressão requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  vi.stubEnv("OS_ACOMPANHAMENTO_SECRET", "segredo-exclusivo-teste-regressao");
  clienteId = (await prisma.cliente.create({ data: { nome: `Regressão ${randomUUID()}`, telefone: "11999999999" } })).id;
  servicoId = (await prisma.servico.create({ data: { nome: "Reparo regressão", precoBase: 100 } })).id;
  formaId = (await prisma.formaPagamento.create({ data: { nome: "Dinheiro regressão", tipo: "DINHEIRO" } })).id;
  caixaId = undefined;
  osId = undefined;
});

afterEach(async () => {
  if (osId) {
    await prisma.movimentacaoCaixa.deleteMany({ where: { ordemServicoId: osId } });
    await prisma.ordemServico.delete({ where: { id: osId } });
  }
  if (caixaId) await prisma.caixa.delete({ where: { id: caixaId } });
  if (formaId) await prisma.formaPagamento.delete({ where: { id: formaId } });
  if (servicoId) await prisma.servico.delete({ where: { id: servicoId } });
  if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } });
  vi.unstubAllEnvs();
});

async function cadastrar() {
  const response = await criarOS(request("ordens-servico", {
    clienteId, numeroOS: String(Date.now()), prazoPrevisto: dataOperacionalHoje(),
    itens: [{ tipoItem: "CALCADO", descricao: "Tênis de teste", servicos: [{ servicoId, valor: 100 }] }],
  }));
  expect(response.status).toBe(201);
  const criada = await response.json();
  osId = criada.id;
  return criada;
}

async function detalhe() {
  const resposta = await detalheOS(request(`ordens-servico/${osId}`), { params: Promise.resolve({ id: osId! }) });
  expect(resposta.status).toBe(200);
  return (await resposta.json()).ordemServico;
}

describe("regressão integrada dos bloqueadores de homologação", () => {
  it.each([0, 1, 3])("detalhe retorna HTTP 200 com %i fotos e opcionais ausentes", async (quantidade) => {
    const criada = await cadastrar();
    for (let i = 0; i < quantidade; i++) {
      await prisma.fotoItemOrdem.create({ data: {
        itemOrdemServicoId: criada.itens[0].id, pathname: `regressao/${criada.id}/${i}.webp`,
      } });
    }
    const resultado = await detalhe();
    expect(resultado.itens[0].fotos).toHaveLength(quantidade);
    expect(resultado.itens[0].possuiFotoRecebimento).toBe(quantidade > 0);
    expect(resultado.itens[0].fotos.every((foto: object) => !("pathname" in foto))).toBe(true);
    for (const foto of resultado.itens[0].fotos) {
      const imagem = await carregarFoto(request("foto"), { params: Promise.resolve({
        id: criada.id, itemId: criada.itens[0].id, fotoId: foto.id,
      }) });
      expect(imagem.status).toBe(200);
      expect(imagem.headers.get("Content-Type")).toBe("image/webp");
      expect(imagem.headers.get("Cache-Control")).toBe("private, no-cache");
      expect(new Uint8Array(await imagem.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    }
    expect(resultado.cliente.email).toBeNull();
    expect(resultado.resumoFinanceiro).toMatchObject({ valorTotal: 100, valorPago: 0, saldo: 100 });
  });

  it("pagamentos parcial e restante conciliam saldo, caixa e relatório sem duplicação", async () => {
    await cadastrar();
    caixaId = (await abrirCaixa({ saldoInicial: 0 })).id;
    for (const [valor, pago, saldo] of [[40, 40, 60], [60, 100, 0]]) {
      const resposta = await pagarOS(request(`ordens-servico/${osId}/pagamentos`, {
        formaPagamentoId: formaId, valor, dataPagamento: dataOperacionalHoje(),
      }), { params: Promise.resolve({ id: osId! }) });
      expect(resposta.status).toBe(201);
      expect((await detalhe()).resumoFinanceiro).toMatchObject({ valorPago: pago, saldo });
      // O relatório filtra por dia no fuso do processo; o intervalo parte da
      // dataEntrada persistida para não depender do fuso da máquina (CI em UTC).
      const { dataEntrada } = await prisma.ordemServico.findUniqueOrThrow({ where: { id: osId! } });
      const dia = formatarDataLocal(dataEntrada);
      const relatorio = await gerarRelatorioFinanceiroOS({ inicio: dia, fim: dia });
      expect(relatorio.itens.find((item) => item.id === osId)).toMatchObject({ valorTotal: 100, valorPago: pago, saldo });
    }
    const excedente = await pagarOS(request(`ordens-servico/${osId}/pagamentos`, {
      formaPagamentoId: formaId, valor: 1, dataPagamento: dataOperacionalHoje(),
    }), { params: Promise.resolve({ id: osId! }) });
    expect(excedente.status).toBe(400);
    const movimentos = await prisma.movimentacaoCaixa.findMany({ where: { caixaId } });
    expect(movimentos).toHaveLength(2);
    expect(new Set(movimentos.map((m) => m.pagamentoId)).size).toBe(2);
    expect(movimentos.every((m) => m.origem === "PAGAMENTO_OS" && Number(m.valor) > 0)).toBe(true);
    expect(movimentos.reduce((soma, m) => soma + Number(m.valor), 0)).toBe(100);
    expect(await prisma.pagamento.count({ where: { ordemServicoId: osId } })).toBe(2);
    const caixa = await obterDetalhesCaixa(caixaId!);
    expect(caixa?.totais.saldoFisicoCalculado).toBe(100);
  });
});
