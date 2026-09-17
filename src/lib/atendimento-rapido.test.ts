import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import * as caixaModule from "./caixa";
import { obterCaixaAberto } from "./caixa";
import {
  AtendimentoRapidoError,
  listarAtendimentosRapidosPaginado,
  registrarAtendimentoRapido,
} from "./atendimento-rapido";
import { normalizarPaginacao } from "./paginacao";
import { prefixoCodigoDoDia } from "./atendimento-rapido-codigo";
import { registrarAtendimentoRapidoSchema, type RegistrarAtendimentoRapidoValues } from "./atendimento-rapido-schema";
import { dataOperacional } from "./date-range";
import { getDashboardMetrics } from "./dashboard-service";
import { registrarPagamentoOrdemServico } from "./ordens-servico-pagamentos";

/**
 * Integração contra o banco de testes (.env.test). Cobre a transação do
 * Atendimento Rápido, as constraints do banco, concorrência, idempotência e
 * os reflexos em caixa, dashboard e no fluxo normal de pagamento de OS.
 */

const hoje = () => dataOperacional(new Date());

let formaPixId: string;
let formaDinheiroId: string;
let servicoHigienizacaoId: string; // catálogo 50.00
let servicoCadarcoId: string; // catálogo 15.90
let servicoInativoId: string;
let usuarioId: string;
let clienteId: string;
let ordemServicoId: string;

async function limparAtendimentosECaixa() {
  // Ordem das FKs: movimentação -> pagamento -> itens -> atendimento -> caixa.
  await prisma.movimentacaoCaixa.deleteMany();
  await prisma.pagamento.deleteMany({ where: { atendimentoRapidoId: { not: null } } });
  if (ordemServicoId) {
    await prisma.pagamento.deleteMany({ where: { ordemServicoId } });
  }
  await prisma.itemAtendimentoRapido.deleteMany();
  await prisma.atendimentoRapido.deleteMany();
  await prisma.caixa.deleteMany();
}

async function limparCadastros() {
  if (ordemServicoId) {
    await prisma.servicoItemOrdem.deleteMany({ where: { itemOrdemServico: { ordemServicoId } } });
    await prisma.itemOrdemServico.deleteMany({ where: { ordemServicoId } });
    await prisma.ordemServico.deleteMany({ where: { id: ordemServicoId } });
  }
  if (clienteId) await prisma.cliente.deleteMany({ where: { id: clienteId } });
  await prisma.servico.deleteMany({
    where: { id: { in: [servicoHigienizacaoId, servicoCadarcoId, servicoInativoId].filter(Boolean) } },
  });
  await prisma.formaPagamento.deleteMany({ where: { id: { in: [formaPixId, formaDinheiroId].filter(Boolean) } } });
  if (usuarioId) await prisma.usuario.deleteMany({ where: { id: usuarioId } });
  ordemServicoId = "";
  clienteId = "";
}

async function contarRegistros() {
  const [atendimentos, itens, pagamentos, movimentacoes] = await Promise.all([
    prisma.atendimentoRapido.count(),
    prisma.itemAtendimentoRapido.count(),
    prisma.pagamento.count({ where: { atendimentoRapidoId: { not: null } } }),
    prisma.movimentacaoCaixa.count({ where: { origem: "ATENDIMENTO_RAPIDO" } }),
  ]);
  return { atendimentos, itens, pagamentos, movimentacoes };
}

const NADA_PERSISTIDO = { atendimentos: 0, itens: 0, pagamentos: 0, movimentacoes: 0 };

/** Monta o payload já validado, a partir de valores como o formulário envia. */
function payload(entrada: {
  chave?: string;
  itens: { servicoId: string; valor: string }[];
  pagamentos: { formaPagamentoId: string; valor: string }[];
  observacoes?: string;
}): RegistrarAtendimentoRapidoValues {
  return registrarAtendimentoRapidoSchema.parse({
    chaveIdempotencia: entrada.chave ?? randomUUID(),
    itens: entrada.itens,
    pagamentos: entrada.pagamentos,
    observacoes: entrada.observacoes,
  });
}

async function criarOrdemServico(valorTotal: number) {
  const cliente = await prisma.cliente.create({ data: { nome: "Cliente AR Teste", telefone: "11999990000" } });
  clienteId = cliente.id;
  const agora = new Date();
  const ordem = await prisma.ordemServico.create({
    data: {
      numero: `OS-TESTE-AR-${randomUUID()}`,
      clienteId,
      dataEntrada: agora,
      dataPrevisao: agora,
      valorTotal,
      saldo: valorTotal,
    },
  });
  ordemServicoId = ordem.id;
  return ordem;
}

beforeEach(async () => {
  await limparAtendimentosECaixa();

  const [pix, dinheiro] = await Promise.all([
    prisma.formaPagamento.create({ data: { nome: "PIX AR Teste", tipo: "PIX" } }),
    prisma.formaPagamento.create({ data: { nome: "Dinheiro AR Teste", tipo: "DINHEIRO" } }),
  ]);
  formaPixId = pix.id;
  formaDinheiroId = dinheiro.id;

  const [higienizacao, cadarco, inativo] = await Promise.all([
    prisma.servico.create({ data: { nome: "Higienização AR Teste", precoBase: 50 } }),
    prisma.servico.create({ data: { nome: "Troca de cadarço AR Teste", precoBase: 15.9 } }),
    prisma.servico.create({ data: { nome: "Serviço inativo AR Teste", precoBase: 10, ativo: false } }),
  ]);
  servicoHigienizacaoId = higienizacao.id;
  servicoCadarcoId = cadarco.id;
  servicoInativoId = inativo.id;

  const usuario = await prisma.usuario.create({
    data: { nome: "Operador AR Teste", email: `operador-ar-${randomUUID()}@teste.local`, senhaHash: "x" },
  });
  usuarioId = usuario.id;

  await prisma.caixa.create({ data: { saldoInicial: 100, status: "ABERTO" } });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await limparAtendimentosECaixa();
  await limparCadastros();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("registrarAtendimentoRapido — criação", () => {
  it("registra AR simples integralmente pago: atendimento, item, pagamento e entrada de caixa", async () => {
    const { atendimento, reaproveitado } = await registrarAtendimentoRapido(
      payload({
        itens: [{ servicoId: servicoHigienizacaoId, valor: "50.00" }],
        pagamentos: [{ formaPagamentoId: formaDinheiroId, valor: "50.00" }],
        observacoes: "Tênis branco",
      }),
      { usuarioId },
    );

    expect(reaproveitado).toBe(false);
    expect(atendimento.codigo).toBe(`${prefixoCodigoDoDia(hoje())}0001`);
    expect(atendimento.codigo).toMatch(/^AR-\d{8}-\d{4}$/);
    expect(Number(atendimento.valorTotal)).toBe(50);
    expect(atendimento.observacoes).toBe("Tênis branco");
    expect(atendimento.criadoPorId).toBe(usuarioId);
    expect(atendimento.itens).toHaveLength(1);
    expect(atendimento.itens[0]).toMatchObject({ descricao: "Higienização AR Teste" });

    const pagamentos = await prisma.pagamento.findMany({ where: { atendimentoRapidoId: atendimento.id } });
    expect(pagamentos).toHaveLength(1);
    expect(pagamentos[0].ordemServicoId).toBeNull();
    expect(pagamentos[0].valor.toString()).toBe("50");
    expect(pagamentos[0].tipo).toBe("PAGAMENTO");

    const movimentacoes = await prisma.movimentacaoCaixa.findMany({ where: { atendimentoRapidoId: atendimento.id } });
    expect(movimentacoes).toHaveLength(1);
    expect(movimentacoes[0]).toMatchObject({
      tipo: "ENTRADA",
      origem: "ATENDIMENTO_RAPIDO",
      pagamentoId: pagamentos[0].id,
      formaPagamentoId: formaDinheiroId,
      ordemServicoId: null,
      vendaId: null,
      descricao: `Atendimento rápido ${atendimento.codigo}`,
    });
    expect(movimentacoes[0].valor.toString()).toBe("50");

    // Caixa: entrada em dinheiro soma no saldo físico com a regra existente.
    const caixa = (await obterCaixaAberto()) as { totais: { saldoFisicoCalculado: number; totalGeralRecebido: number } };
    expect(caixa.totais.saldoFisicoCalculado).toBe(150);
    expect(caixa.totais.totalGeralRecebido).toBe(50);
  });

  it("registra múltiplos serviços (inclusive o mesmo serviço repetido) com total calculado no servidor", async () => {
    const { atendimento } = await registrarAtendimentoRapido(
      payload({
        itens: [
          { servicoId: servicoHigienizacaoId, valor: "50.00" },
          { servicoId: servicoHigienizacaoId, valor: "50.00" },
          { servicoId: servicoCadarcoId, valor: "15.90" },
        ],
        pagamentos: [{ formaPagamentoId: formaPixId, valor: "115.90" }],
      }),
    );

    expect(Number(atendimento.valorTotal)).toBe(115.9);
    const itens = await prisma.itemAtendimentoRapido.findMany({
      where: { atendimentoRapidoId: atendimento.id },
      orderBy: { descricao: "asc" },
    });
    // Mesmo serviço duas vezes = dois itens (sem quantidade).
    expect(itens.map((item) => [item.descricao, item.valor.toString()])).toEqual([
      ["Higienização AR Teste", "50"],
      ["Higienização AR Teste", "50"],
      ["Troca de cadarço AR Teste", "15.9"],
    ]);
  });

  it("grava o preço sobrescrito como snapshot sem alterar o catálogo", async () => {
    const { atendimento } = await registrarAtendimentoRapido(
      payload({
        itens: [{ servicoId: servicoHigienizacaoId, valor: "35.50" }],
        pagamentos: [{ formaPagamentoId: formaPixId, valor: "35.50" }],
      }),
    );

    const item = await prisma.itemAtendimentoRapido.findFirstOrThrow({ where: { atendimentoRapidoId: atendimento.id } });
    expect(item.valor.toString()).toBe("35.5");

    const servico = await prisma.servico.findUniqueOrThrow({ where: { id: servicoHigienizacaoId } });
    expect(servico.precoBase.toString()).toBe("50");

    // Mudar o catálogo depois não altera o atendimento.
    await prisma.servico.update({ where: { id: servicoHigienizacaoId }, data: { precoBase: 80, nome: "Higienização premium" } });
    const itemDepois = await prisma.itemAtendimentoRapido.findUniqueOrThrow({ where: { id: item.id } });
    expect(itemDepois.valor.toString()).toBe("35.5");
    expect(itemDepois.descricao).toBe("Higienização AR Teste");
  });

  it("registra pagamento dividido: um Pagamento e uma entrada de caixa por forma", async () => {
    const { atendimento } = await registrarAtendimentoRapido(
      payload({
        itens: [
          { servicoId: servicoHigienizacaoId, valor: "50.00" },
          { servicoId: servicoHigienizacaoId, valor: "50.00" },
        ],
        pagamentos: [
          { formaPagamentoId: formaPixId, valor: "60.00" },
          { formaPagamentoId: formaDinheiroId, valor: "40.00" },
        ],
      }),
    );

    const pagamentos = await prisma.pagamento.findMany({
      where: { atendimentoRapidoId: atendimento.id },
      include: { movimentacaoCaixa: true },
    });
    expect(pagamentos).toHaveLength(2);
    const porForma = Object.fromEntries(pagamentos.map((p) => [p.formaPagamentoId, p]));
    expect(porForma[formaPixId].valor.toString()).toBe("60");
    expect(porForma[formaDinheiroId].valor.toString()).toBe("40");
    for (const pagamento of pagamentos) {
      expect(pagamento.movimentacaoCaixa?.valor.toString()).toBe(pagamento.valor.toString());
      expect(pagamento.movimentacaoCaixa?.formaPagamentoId).toBe(pagamento.formaPagamentoId);
    }

    // Só a parte em dinheiro entra no saldo físico; o recebido total é 100.
    const caixa = (await obterCaixaAberto()) as {
      totais: { saldoFisicoCalculado: number; totalGeralRecebido: number; totaisPorFormaPagamento: Record<string, number> };
    };
    expect(caixa.totais.saldoFisicoCalculado).toBe(140);
    expect(caixa.totais.totalGeralRecebido).toBe(100);
    expect(caixa.totais.totaisPorFormaPagamento).toMatchObject({ "PIX AR TESTE": 60, "DINHEIRO AR TESTE": 40 });
  });
});

describe("registrarAtendimentoRapido — validações sem persistência", () => {
  const itensPadrao = () => [
    { servicoId: servicoHigienizacaoId, valorCentavos: 5000 },
    { servicoId: servicoHigienizacaoId, valorCentavos: 5000 },
  ];

  it("rejeita pagamentos somando menos que o total", async () => {
    await expect(
      registrarAtendimentoRapido({
        chaveIdempotencia: randomUUID(),
        itens: itensPadrao(),
        pagamentos: [{ formaPagamentoId: formaPixId, valorCentavos: 9999 }],
      }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/soma dos pagamentos/) });
    expect(await contarRegistros()).toEqual(NADA_PERSISTIDO);
  });

  it("rejeita pagamentos somando mais que o total", async () => {
    await expect(
      registrarAtendimentoRapido({
        chaveIdempotencia: randomUUID(),
        itens: itensPadrao(),
        pagamentos: [
          { formaPagamentoId: formaPixId, valorCentavos: 6000 },
          { formaPagamentoId: formaDinheiroId, valorCentavos: 4001 },
        ],
      }),
    ).rejects.toBeInstanceOf(AtendimentoRapidoError);
    expect(await contarRegistros()).toEqual(NADA_PERSISTIDO);
  });

  it("rejeita sem caixa aberto (caixa fechado) sem persistir nada", async () => {
    await prisma.caixa.updateMany({ data: { status: "FECHADO", dataFechamento: new Date() } });

    await expect(
      registrarAtendimentoRapido(
        payload({
          itens: [{ servicoId: servicoHigienizacaoId, valor: "50.00" }],
          pagamentos: [{ formaPagamentoId: formaDinheiroId, valor: "50.00" }],
        }),
      ),
    ).rejects.toMatchObject({ status: 400, message: "Não há caixa aberto. Abra o caixa primeiro." });
    expect(await contarRegistros()).toEqual(NADA_PERSISTIDO);
  });

  it("rejeita serviço inativo, serviço inexistente e forma de pagamento inexistente", async () => {
    const base = { pagamentos: [{ formaPagamentoId: formaPixId, valor: "10.00" }] };

    await expect(
      registrarAtendimentoRapido(payload({ ...base, itens: [{ servicoId: servicoInativoId, valor: "10.00" }] })),
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/inativo/) });

    await expect(
      registrarAtendimentoRapido(payload({ ...base, itens: [{ servicoId: "nao-existe", valor: "10.00" }] })),
    ).rejects.toMatchObject({ status: 400, message: "Serviço informado não encontrado." });

    await expect(
      registrarAtendimentoRapido(
        payload({
          itens: [{ servicoId: servicoCadarcoId, valor: "10.00" }],
          pagamentos: [{ formaPagamentoId: "nao-existe", valor: "10.00" }],
        }),
      ),
    ).rejects.toMatchObject({ status: 400, message: "Forma de pagamento inválida." });

    expect(await contarRegistros()).toEqual(NADA_PERSISTIDO);
  });
});

describe("registrarAtendimentoRapido — rollback integral", () => {
  const entradaDividida = () =>
    payload({
      itens: [
        { servicoId: servicoHigienizacaoId, valor: "50.00" },
        { servicoId: servicoHigienizacaoId, valor: "50.00" },
      ],
      pagamentos: [
        { formaPagamentoId: formaPixId, valor: "60.00" },
        { formaPagamentoId: formaDinheiroId, valor: "40.00" },
      ],
    });

  it("desfaz atendimento e itens quando a criação do pagamento falha", async () => {
    const transacaoOriginal = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, "$transaction").mockImplementation(((callback: (tx: Prisma.TransactionClient) => unknown, opcoes?: object) =>
      transacaoOriginal((tx) => {
        const txComFalha = new Proxy(tx, {
          get(alvo, propriedade, receptor) {
            if (propriedade === "pagamento") {
              return { ...alvo.pagamento, create: () => Promise.reject(new Error("falha simulada no pagamento")) };
            }
            return Reflect.get(alvo, propriedade, receptor);
          },
        });
        return callback(txComFalha) as Promise<unknown>;
      }, opcoes)) as never);

    await expect(registrarAtendimentoRapido(entradaDividida())).rejects.toThrow("falha simulada no pagamento");
    expect(await contarRegistros()).toEqual(NADA_PERSISTIDO);
  });

  it("desfaz tudo quando a entrada de caixa do SEGUNDO pagamento falha (primeiro par já gravado na transação)", async () => {
    const original = caixaModule.registrarMovimentacaoAutomaticaCaixa;
    let chamadas = 0;
    vi.spyOn(caixaModule, "registrarMovimentacaoAutomaticaCaixa").mockImplementation(async (dados, tx) => {
      chamadas += 1;
      if (chamadas === 2) throw new caixaModule.CaixaError("Não é possível movimentar um caixa fechado.", 400);
      return original(dados, tx);
    });

    await expect(registrarAtendimentoRapido(entradaDividida())).rejects.toThrow("caixa fechado");
    expect(chamadas).toBe(2);
    expect(await contarRegistros()).toEqual(NADA_PERSISTIDO);

    const servico = await prisma.servico.findUniqueOrThrow({ where: { id: servicoHigienizacaoId } });
    expect(servico.precoBase.toString()).toBe("50");
  });
});

describe("registrarAtendimentoRapido — idempotência", () => {
  const entrada = (chave: string, valor = "50.00") =>
    payload({
      chave,
      itens: [{ servicoId: servicoHigienizacaoId, valor: valor }],
      pagamentos: [{ formaPagamentoId: formaDinheiroId, valor }],
    });

  it("reenvio sequencial da mesma chave devolve o mesmo atendimento sem gravar de novo", async () => {
    const chave = randomUUID();
    const primeiro = await registrarAtendimentoRapido(entrada(chave));
    const segundo = await registrarAtendimentoRapido(entrada(chave));

    expect(segundo.reaproveitado).toBe(true);
    expect(segundo.atendimento.id).toBe(primeiro.atendimento.id);
    expect(await contarRegistros()).toEqual({ atendimentos: 1, itens: 1, pagamentos: 1, movimentacoes: 1 });
  });

  it("envios concorrentes da mesma chave (duplo clique) criam um único atendimento", async () => {
    const chave = randomUUID();
    const resultados = await Promise.all([1, 2, 3, 4].map(() => registrarAtendimentoRapido(entrada(chave))));

    expect(new Set(resultados.map((r) => r.atendimento.id)).size).toBe(1);
    expect(resultados.filter((r) => !r.reaproveitado)).toHaveLength(1);
    expect(await contarRegistros()).toEqual({ atendimentos: 1, itens: 1, pagamentos: 1, movimentacoes: 1 });
  });

  it("mesma chave com conteúdo diferente é rejeitada com 409", async () => {
    const chave = randomUUID();
    await registrarAtendimentoRapido(entrada(chave));

    await expect(registrarAtendimentoRapido(entrada(chave, "45.00"))).rejects.toMatchObject({ status: 409 });
    expect(await contarRegistros()).toEqual({ atendimentos: 1, itens: 1, pagamentos: 1, movimentacoes: 1 });
  });
});

describe("registrarAtendimentoRapido — código AR", () => {
  const entrada = () =>
    payload({
      itens: [{ servicoId: servicoCadarcoId, valor: "15.90" }],
      pagamentos: [{ formaPagamentoId: formaPixId, valor: "15.90" }],
    });

  it("criações concorrentes recebem códigos únicos e sequenciais", async () => {
    const resultados = await Promise.all(Array.from({ length: 6 }, () => registrarAtendimentoRapido(entrada())));
    const prefixo = prefixoCodigoDoDia(hoje());
    const codigos = resultados.map((r) => r.atendimento.codigo).sort();

    expect(new Set(codigos).size).toBe(6);
    expect(codigos).toEqual(["0001", "0002", "0003", "0004", "0005", "0006"].map((n) => `${prefixo}${n}`));
    expect(await contarRegistros()).toEqual({ atendimentos: 6, itens: 6, pagamentos: 6, movimentacoes: 6 });
  });

  it("sequencial é diário: continua do maior código do dia e ignora outros dias", async () => {
    const prefixo = prefixoCodigoDoDia(hoje());
    const criarLegado = (codigo: string) =>
      prisma.atendimentoRapido.create({
        data: { codigo, valorTotal: 10, chaveIdempotencia: randomUUID() },
      });
    await criarLegado("AR-01012020-0042");
    await criarLegado(`${prefixo}0007`);

    const { atendimento } = await registrarAtendimentoRapido(entrada());
    expect(atendimento.codigo).toBe(`${prefixo}0008`);
  });

  it("UNIQUE no banco impede código repetido", async () => {
    const codigo = `${prefixoCodigoDoDia(hoje())}0001`;
    await prisma.atendimentoRapido.create({ data: { codigo, valorTotal: 10, chaveIdempotencia: randomUUID() } });

    await expect(
      prisma.atendimentoRapido.create({ data: { codigo, valorTotal: 10, chaveIdempotencia: randomUUID() } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("listarAtendimentosRapidosPaginado", () => {
  it("lista com serviços, total e formas de pagamento e busca pelo código AR", async () => {
    const criar = (valor: string) =>
      registrarAtendimentoRapido(
        payload({
          itens: [{ servicoId: servicoCadarcoId, valor: valor }],
          pagamentos: [{ formaPagamentoId: formaPixId, valor }],
        }),
      );
    await criar("10.00");
    const { atendimento: segundo } = await criar("20.00");

    const todos = await listarAtendimentosRapidosPaginado({ paginacao: normalizarPaginacao() });
    expect(todos.pagination.total).toBe(2);
    expect(todos.data[0]).toMatchObject({
      codigo: segundo.codigo,
      valorTotal: 20,
      itens: [{ descricao: "Troca de cadarço AR Teste", valor: 20 }],
      pagamentos: [{ valor: 20, formaPagamento: { nome: "PIX AR Teste" } }],
    });
    expect(typeof todos.data[0].dataHora).toBe("string");

    const filtrado = await listarAtendimentosRapidosPaginado({
      filtros: { busca: segundo.codigo.toLowerCase(), dataInicial: hoje(), dataFinal: hoje() },
      paginacao: normalizarPaginacao(),
    });
    expect(filtrado.data.map((a) => a.codigo)).toEqual([segundo.codigo]);

    const outroDia = await listarAtendimentosRapidosPaginado({
      filtros: { dataInicial: "2020-01-01", dataFinal: "2020-01-02" },
      paginacao: normalizarPaginacao(),
    });
    expect(outroDia.pagination.total).toBe(0);
  });
});

describe("constraints do banco", () => {
  async function criarAtendimentoDireto() {
    return prisma.atendimentoRapido.create({
      data: { codigo: `${prefixoCodigoDoDia(hoje())}0900`, valorTotal: 10, chaveIdempotencia: randomUUID() },
    });
  }

  const erroDeCheck = (constraint: string) =>
    expect.objectContaining({ message: expect.stringContaining(constraint) });

  it("aceita Pagamento somente com Ordem de Serviço", async () => {
    const ordem = await criarOrdemServico(100);
    const pagamento = await prisma.pagamento.create({
      data: { ordemServicoId: ordem.id, formaPagamentoId: formaPixId, tipo: "PAGAMENTO", valor: 10, dataPagamento: new Date() },
    });
    expect(pagamento.atendimentoRapidoId).toBeNull();
  });

  it("aceita Pagamento somente com Atendimento Rápido", async () => {
    const atendimento = await criarAtendimentoDireto();
    const pagamento = await prisma.pagamento.create({
      data: { atendimentoRapidoId: atendimento.id, formaPagamentoId: formaPixId, tipo: "PAGAMENTO", valor: 10, dataPagamento: new Date() },
    });
    expect(pagamento.ordemServicoId).toBeNull();
  });

  it("rejeita Pagamento sem origem", async () => {
    await expect(
      prisma.pagamento.create({
        data: { formaPagamentoId: formaPixId, tipo: "PAGAMENTO", valor: 10, dataPagamento: new Date() },
      }),
    ).rejects.toEqual(erroDeCheck("Pagamento_origem_exclusiva_check"));
  });

  it("rejeita Pagamento com duas origens", async () => {
    const ordem = await criarOrdemServico(100);
    const atendimento = await criarAtendimentoDireto();
    await expect(
      prisma.pagamento.create({
        data: {
          ordemServicoId: ordem.id,
          atendimentoRapidoId: atendimento.id,
          formaPagamentoId: formaPixId,
          tipo: "PAGAMENTO",
          valor: 10,
          dataPagamento: new Date(),
        },
      }),
    ).rejects.toEqual(erroDeCheck("Pagamento_origem_exclusiva_check"));
  });

  it("rejeita valores zero ou negativos no atendimento e nos itens", async () => {
    await expect(
      prisma.atendimentoRapido.create({
        data: { codigo: `${prefixoCodigoDoDia(hoje())}0901`, valorTotal: 0, chaveIdempotencia: randomUUID() },
      }),
    ).rejects.toEqual(erroDeCheck("AtendimentoRapido_valorTotal_positivo_check"));

    const atendimento = await criarAtendimentoDireto();
    const item = (valor: number) =>
      prisma.itemAtendimentoRapido.create({
        data: { atendimentoRapidoId: atendimento.id, servicoId: servicoCadarcoId, descricao: "x", valor },
      });

    await expect(item(0)).rejects.toEqual(erroDeCheck("ItemAtendimentoRapido_valor_positivo_check"));
    await expect(item(-10)).rejects.toEqual(erroDeCheck("ItemAtendimentoRapido_valor_positivo_check"));
  });

  it("rejeita código fora do formato AR-DDMMAAAA-NNNN", async () => {
    await expect(
      prisma.atendimentoRapido.create({ data: { codigo: "AR-1-1", valorTotal: 10, chaveIdempotencia: randomUUID() } }),
    ).rejects.toEqual(erroDeCheck("AtendimentoRapido_codigo_formato_check"));
  });

  it("impede excluir fisicamente um atendimento com pagamento (ON DELETE RESTRICT)", async () => {
    const { atendimento } = await registrarAtendimentoRapido(
      payload({
        itens: [{ servicoId: servicoCadarcoId, valor: "15.90" }],
        pagamentos: [{ formaPagamentoId: formaPixId, valor: "15.90" }],
      }),
    );
    await expect(prisma.atendimentoRapido.delete({ where: { id: atendimento.id } })).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    expect((await contarRegistros()).atendimentos).toBe(1);
  });
});

describe("reflexos no dashboard e regressão do pagamento de OS", () => {
  it("regressão: pagamento normal de OS continua gravando ordemServicoId, caixa PAGAMENTO_OS e saldo", async () => {
    const ordem = await criarOrdemServico(100);

    const resultado = await registrarPagamentoOrdemServico(ordem.id, {
      formaPagamentoId: formaPixId,
      valor: 40,
      dataPagamento: new Date(),
    });

    expect(resultado.pagamento.ordemServicoId).toBe(ordem.id);
    expect(resultado.pagamento.atendimentoRapidoId).toBeNull();
    expect(Number(resultado.ordemServico?.saldo)).toBe(60);

    const movimentacao = await prisma.movimentacaoCaixa.findUniqueOrThrow({ where: { pagamentoId: resultado.pagamento.id } });
    expect(movimentacao).toMatchObject({ origem: "PAGAMENTO_OS", ordemServicoId: ordem.id, atendimentoRapidoId: null });

    await expect(
      registrarPagamentoOrdemServico(ordem.id, { formaPagamentoId: formaPixId, valor: 61, dataPagamento: new Date() }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("total recebido soma pagamentos de OS e de AR sem duplicar; ranking soma execuções de OS e AR", async () => {
    const dia = hoje();
    const antes = await getDashboardMetrics(dia, dia);

    // OS com a Higienização aplicada a um item e pagamento de 40.
    const ordem = await criarOrdemServico(100);
    await prisma.itemOrdemServico.create({
      data: {
        ordemServicoId: ordem.id,
        tipoItem: "TENIS",
        descricao: "Tênis",
        servicos: { create: [{ servicoId: servicoHigienizacaoId, valor: 100 }] },
      },
    });
    await registrarPagamentoOrdemServico(ordem.id, { formaPagamentoId: formaPixId, valor: 40, dataPagamento: new Date() });

    // AR com 3 execuções de Higienização (3 itens), pago dividido (60 + 90).
    await registrarAtendimentoRapido(
      payload({
        itens: [
          { servicoId: servicoHigienizacaoId, valor: "50.00" },
          { servicoId: servicoHigienizacaoId, valor: "50.00" },
          { servicoId: servicoHigienizacaoId, valor: "50.00" },
        ],
        pagamentos: [
          { formaPagamentoId: formaPixId, valor: "60.00" },
          { formaPagamentoId: formaDinheiroId, valor: "90.00" },
        ],
      }),
    );

    const depois = await getDashboardMetrics(dia, dia);

    expect(depois.totalRecebido - antes.totalRecebido).toBeCloseTo(190, 2);

    // Série diária (#226): mesma base do total, então o AR entra no dia e a soma continua igual ao total.
    const valorDoDia = (metricas: typeof antes) => metricas.recebimentosPorDia?.find((item) => item.dia === dia)?.valor ?? 0;
    expect(valorDoDia(depois) - valorDoDia(antes)).toBeCloseTo(190, 2);
    expect(depois.recebimentosPorDia?.reduce((soma, item) => soma + item.valor, 0)).toBeCloseTo(depois.totalRecebido, 2);

    const execucoes = (metricas: typeof antes) =>
      metricas.topServicos.find((servico) => servico.id === servicoHigienizacaoId)?.quantidade ?? 0;
    expect(execucoes(antes)).toBe(0);
    expect(execucoes(depois)).toBe(4);

    // AR não tem saldo: o pendente só reflete a OS.
    expect(depois.totalPendente - antes.totalPendente).toBeCloseTo(60, 2);
  });
});
