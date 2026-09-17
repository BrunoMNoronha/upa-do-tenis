import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as dashboard } from "@/app/api/dashboard/route";
import { gerarRelatorioFinanceiroOS } from "@/lib/relatorio-financeiro-os-service";

// Apenas a sessão é simulada. Rota, serviço e consultas são reais.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

const BANCOS_PERMITIDOS = ["/upa_do_tenis_test", "/upa_do_tenis_ci"];

// 10/03/2031 22:30 em São Paulo = 11/03/2031 01:30 UTC. Data distante para
// não colidir com registros de outras suítes no mesmo dia.
const DIA = "2031-03-10";
const DIA_SEGUINTE = "2031-03-11";
const REGISTRO_22H30_SAO_PAULO = new Date("2031-03-10T22:30:00-03:00");

const tzOriginal = process.env.TZ;
let clienteId: string | undefined;
let formaId: string | undefined;
let osId: string | undefined;

beforeAll(() => {
  // Mesmo cenário da Vercel: processo em UTC.
  process.env.TZ = "UTC";
});

afterAll(() => {
  if (tzOriginal === undefined) delete process.env.TZ;
  else process.env.TZ = tzOriginal;
});

beforeEach(async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  if (destino.hostname !== "localhost" || !BANCOS_PERMITIDOS.includes(destino.pathname)) {
    throw new Error("Esta suíte requer exclusivamente o banco local de testes ou o banco efêmero da CI.");
  }
  expect(new Date().getTimezoneOffset()).toBe(0);

  clienteId = (await prisma.cliente.create({ data: { nome: `Fuso ${randomUUID()}`, telefone: "11999999999" } })).id;
  formaId = (await prisma.formaPagamento.create({ data: { nome: "Dinheiro fuso", tipo: "DINHEIRO" } })).id;
  osId = (await prisma.ordemServico.create({
    data: {
      numero: `FUSO-${randomUUID()}`,
      clienteId,
      dataEntrada: REGISTRO_22H30_SAO_PAULO,
      dataPrevisao: REGISTRO_22H30_SAO_PAULO,
      valorTotal: 100,
      valorPago: 40,
      saldo: 60,
    },
  })).id;
  await prisma.pagamento.create({
    data: {
      ordemServicoId: osId,
      formaPagamentoId: formaId,
      tipo: "PAGAMENTO",
      valor: 40,
      dataPagamento: REGISTRO_22H30_SAO_PAULO,
    },
  });
});

afterEach(async () => {
  if (osId) {
    await prisma.pagamento.deleteMany({ where: { ordemServicoId: osId } });
    await prisma.ordemServico.delete({ where: { id: osId } });
  }
  if (formaId) await prisma.formaPagamento.delete({ where: { id: formaId } });
  if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } });
  osId = formaId = clienteId = undefined;
});

async function metricas(inicio: string, fim: string) {
  const resposta = await dashboard(new NextRequest(`http://localhost/api/dashboard?inicio=${inicio}&fim=${fim}`));
  expect(resposta.status).toBe(200);
  return resposta.json();
}

describe("filtros de período no fuso da operação com processo em UTC", () => {
  it("dashboard conta o registro das 22:30 no dia de São Paulo, não no dia UTC", async () => {
    const noDia = await metricas(DIA, DIA);
    expect(noDia.totalRecebido).toBe(40);
    expect(noDia.totalPendente).toBe(60);
    expect(noDia.osAbertas).toBe(1);

    const noDiaSeguinte = await metricas(DIA_SEGUINTE, DIA_SEGUINTE);
    expect(noDiaSeguinte.totalRecebido).toBe(0);
    expect(noDiaSeguinte.totalPendente).toBe(0);
    expect(noDiaSeguinte.osAbertas).toBe(0);
  });

  it("relatório financeiro de OS lista a OS das 22:30 no dia de São Paulo, não no dia UTC", async () => {
    const noDia = await gerarRelatorioFinanceiroOS({ inicio: DIA, fim: DIA });
    expect(noDia.itens.map((item) => item.id)).toContain(osId);

    const noDiaSeguinte = await gerarRelatorioFinanceiroOS({ inicio: DIA_SEGUINTE, fim: DIA_SEGUINTE });
    expect(noDiaSeguinte.itens.map((item) => item.id)).not.toContain(osId);
  });
});
