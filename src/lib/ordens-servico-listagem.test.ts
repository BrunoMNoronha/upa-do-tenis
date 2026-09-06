import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  filtrarOrdensServicoListagem,
  ordemServicoCorrespondeBusca,
} from "@/lib/ordens-servico-listagem";
import { listarOrdensServico } from "@/lib/ordens-servico";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    ordemServico: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("ordens-servico listagem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deriva status financeiro pendente, parcial e pago", async () => {
    prismaMock.ordemServico.findMany.mockResolvedValueOnce([
      {
        id: "os-pendente",
        numero: "OS-1001",
        status: "ABERTA",
        dataPrevisao: new Date("2026-07-10T10:00:00.000Z"),
        valorTotal: new Prisma.Decimal(100),
        valorDesconto: new Prisma.Decimal(0),
        valorSinal: new Prisma.Decimal(0),
        valorPago: new Prisma.Decimal(0),
        observacoes: null,
        cliente: { id: "c1", nome: "A", telefone: "11" },
        itens: [],
        pagamentos: [],
        historicosStatus: [],
      },
      {
        id: "os-parcial",
        numero: "OS-1002",
        status: "ABERTA",
        dataPrevisao: new Date("2026-07-10T10:00:00.000Z"),
        valorTotal: new Prisma.Decimal(100),
        valorDesconto: new Prisma.Decimal(0),
        valorSinal: new Prisma.Decimal(0),
        valorPago: new Prisma.Decimal(0),
        observacoes: null,
        cliente: { id: "c2", nome: "B", telefone: "22" },
        itens: [],
        pagamentos: [{ valor: new Prisma.Decimal(40) }],
        historicosStatus: [],
      },
      {
        id: "os-pago",
        numero: "OS-1003",
        status: "ABERTA",
        dataPrevisao: new Date("2026-07-10T10:00:00.000Z"),
        valorTotal: new Prisma.Decimal(100),
        valorDesconto: new Prisma.Decimal(0),
        valorSinal: new Prisma.Decimal(0),
        valorPago: new Prisma.Decimal(0),
        observacoes: null,
        cliente: { id: "c3", nome: "C", telefone: "33" },
        itens: [],
        pagamentos: [{ valor: new Prisma.Decimal(100) }],
        historicosStatus: [],
      },
    ]);

    const ordens = await listarOrdensServico();

    expect(ordens.find((o) => o.id === "os-pendente")?.statusFinanceiro).toBe("PENDENTE");
    expect(ordens.find((o) => o.id === "os-parcial")?.statusFinanceiro).toBe("PARCIAL");
    expect(ordens.find((o) => o.id === "os-pago")?.statusFinanceiro).toBe("PAGO");
  });

  it("filtra por saldo em aberto", () => {
    const resultado = filtrarOrdensServicoListagem({
      ordens: [
        { status: "ABERTA", statusFinanceiro: "PENDENTE", saldo: 100 },
        { status: "ABERTA", statusFinanceiro: "PAGO", saldo: 0 },
        { status: "ENTREGUE", statusFinanceiro: "PARCIAL", saldo: 10 },
      ],
      statusOperacional: "TODAS",
      statusFinanceiro: "COM_SALDO_EM_ABERTO",
    });

    expect(resultado).toHaveLength(2);
    expect(resultado.every((o) => Number(o.saldo) > 0)).toBe(true);
  });

  it("mantem compatibilidade com OS sem pagamentos", async () => {
    prismaMock.ordemServico.findMany.mockResolvedValueOnce([
      {
        id: "os-sem-pagamento",
        numero: "OS-1004",
        status: "ABERTA",
        dataPrevisao: new Date("2026-07-10T10:00:00.000Z"),
        valorTotal: new Prisma.Decimal(120),
        valorDesconto: new Prisma.Decimal(0),
        valorSinal: new Prisma.Decimal(0),
        valorPago: new Prisma.Decimal(0),
        observacoes: null,
        cliente: { id: "c4", nome: "D", telefone: "44" },
        itens: [],
        pagamentos: [],
        historicosStatus: [],
      },
    ]);

    const ordens = await listarOrdensServico();

    expect(ordens[0].valorPago).toBe(0);
    expect(ordens[0].saldo).toBe(120);
    expect(ordens[0].statusFinanceiro).toBe("PENDENTE");
  });

  describe("busca por texto/telefone", () => {
    const ordem = {
      numero: "OS-20260704-0001",
      cliente: { nome: "Bruno Noronha", telefone: "(61) 98530-7168" },
    };

    it("encontra pelo telefone sem máscara", () => {
      expect(ordemServicoCorrespondeBusca(ordem, "61985307168")).toBe(true);
    });

    it("encontra pelo telefone com máscara", () => {
      expect(ordemServicoCorrespondeBusca(ordem, "(61) 98530-7168")).toBe(true);
    });

    it("encontra por trecho parcial do telefone", () => {
      expect(ordemServicoCorrespondeBusca(ordem, "985307168")).toBe(true);
    });

    it("continua encontrando pelo nome do cliente", () => {
      expect(ordemServicoCorrespondeBusca(ordem, "Bruno")).toBe(true);
    });

    it("continua encontrando pelo número da OS", () => {
      expect(ordemServicoCorrespondeBusca(ordem, "0001")).toBe(true);
    });

    it("não encontra quando não há correspondência", () => {
      expect(ordemServicoCorrespondeBusca(ordem, "99999999999")).toBe(false);
      expect(ordemServicoCorrespondeBusca(ordem, "Maria")).toBe(false);
    });

    it("retorna todas as OS quando o termo é vazio", () => {
      expect(ordemServicoCorrespondeBusca(ordem, "")).toBe(true);
      expect(ordemServicoCorrespondeBusca(ordem, "   ")).toBe(true);
    });
  });

  it("nao quebra com OS antigas (valorPago legado sem pagamentos)", async () => {
    prismaMock.ordemServico.findMany.mockResolvedValueOnce([
      {
        id: "os-legada",
        numero: "OS-0901",
        status: "ABERTA",
        dataPrevisao: new Date("2026-07-10T10:00:00.000Z"),
        valorTotal: new Prisma.Decimal(200),
        valorDesconto: new Prisma.Decimal(0),
        valorSinal: new Prisma.Decimal(0),
        valorPago: new Prisma.Decimal(80),
        observacoes: "Legada",
        cliente: { id: "c5", nome: "E", telefone: "55" },
        itens: [],
        pagamentos: [],
        historicosStatus: [],
      },
    ]);

    const ordens = await listarOrdensServico();

    expect(ordens[0].valorPago).toBe(80);
    expect(ordens[0].saldo).toBe(120);
    expect(ordens[0].statusFinanceiro).toBe("PARCIAL");
  });

  it("ordena pela data operacional com criadoEm como desempate", async () => {
    prismaMock.ordemServico.findMany.mockResolvedValueOnce([]);

    await listarOrdensServico();

    expect(prismaMock.ordemServico.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ dataEntrada: "desc" }, { criadoEm: "desc" }],
      }),
    );
  });
});
