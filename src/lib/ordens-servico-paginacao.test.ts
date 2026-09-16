import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  montarWhereListagemOrdensServico,
  normalizarFiltrosListagemOrdensServico,
} from "@/lib/ordens-servico-listagem";
import { normalizarPaginacao } from "@/lib/paginacao";
import {
  contarEstatisticasOrdensServico,
  listarOrdensServicoPaginado,
} from "@/lib/ordens-servico";

const { prismaMock, valorTotalRef } = vi.hoisted(() => {
  const valorTotalRef = { __ref: "ordemServico.valorTotal" };
  return {
    valorTotalRef,
    prismaMock: {
      ordemServico: {
        findMany: vi.fn(),
        count: vi.fn(),
        fields: { valorTotal: valorTotalRef },
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

function ordemBruta(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    numero: `OS-${id}`,
    status: "ABERTA",
    favorita: false,
    dataEntrada: new Date("2026-09-01T12:00:00"),
    dataPrevisao: new Date("2026-09-10T12:00:00"),
    criadoEm: new Date("2026-09-01T12:00:00"),
    valorTotal: new Prisma.Decimal(100),
    valorDesconto: new Prisma.Decimal(0),
    valorSinal: new Prisma.Decimal(0),
    valorPago: new Prisma.Decimal(0),
    saldo: new Prisma.Decimal(100),
    observacoes: null,
    cliente: { id: "c1", nome: "Cliente", telefone: "11999999999" },
    itens: [],
    pagamentos: [],
    historicosStatus: [],
    ...extra,
  };
}

describe("normalizarFiltrosListagemOrdensServico", () => {
  it("usa TODAS/falso para valores ausentes ou desconhecidos", () => {
    expect(normalizarFiltrosListagemOrdensServico({})).toEqual({
      statusOperacional: "TODAS",
      statusFinanceiro: "TODAS",
      busca: "",
      atrasadas: false,
    });
    expect(
      normalizarFiltrosListagemOrdensServico(new URLSearchParams("statusOp=INVALIDO&statusFin=xpto&atrasadas=sim")),
    ).toEqual({ statusOperacional: "TODAS", statusFinanceiro: "TODAS", busca: "", atrasadas: false });
  });

  it("aceita os filtros válidos e normaliza a busca", () => {
    expect(
      normalizarFiltrosListagemOrdensServico({
        statusOp: "aberta",
        statusFin: "COM_SALDO_EM_ABERTO",
        busca: "  Maria ",
        atrasadas: "true",
      }),
    ).toEqual({ statusOperacional: "ABERTA", statusFinanceiro: "COM_SALDO_EM_ABERTO", busca: "Maria", atrasadas: true });
  });
});

describe("montarWhereListagemOrdensServico", () => {
  const contexto = { agora: new Date("2026-09-16T15:30:00"), referencias: { valorTotal: valorTotalRef } };

  it("sem filtros devolve where vazio", () => {
    expect(montarWhereListagemOrdensServico({}, contexto)).toEqual({});
    expect(
      montarWhereListagemOrdensServico(
        { statusOperacional: "TODAS", statusFinanceiro: "TODAS", busca: "", atrasadas: false },
        contexto,
      ),
    ).toEqual({});
  });

  it("filtra por status operacional", () => {
    expect(montarWhereListagemOrdensServico({ statusOperacional: "EM_ANDAMENTO" }, contexto)).toEqual({
      AND: [{ status: "EM_ANDAMENTO" }],
    });
  });

  it("filtro financeiro usa as colunas persistidas com a mesma regra da tela", () => {
    expect(montarWhereListagemOrdensServico({ statusFinanceiro: "PENDENTES" }, contexto)).toEqual({
      AND: [{ status: { not: "CANCELADA" } }, { valorPago: { lte: 0 } }],
    });
    expect(montarWhereListagemOrdensServico({ statusFinanceiro: "PARCIAIS" }, contexto)).toEqual({
      AND: [
        { status: { not: "CANCELADA" } },
        { valorPago: { gt: 0 } },
        { valorPago: { lt: valorTotalRef } },
      ],
    });
    expect(montarWhereListagemOrdensServico({ statusFinanceiro: "PAGAS" }, contexto)).toEqual({
      AND: [
        { status: { not: "CANCELADA" } },
        { valorPago: { gt: 0 } },
        { valorPago: { gte: valorTotalRef } },
      ],
    });
    expect(montarWhereListagemOrdensServico({ statusFinanceiro: "COM_SALDO_EM_ABERTO" }, contexto)).toEqual({
      AND: [{ saldo: { gt: 0 } }],
    });
  });

  it("busca por nome do cliente, número da OS e telefone (somente dígitos)", () => {
    expect(montarWhereListagemOrdensServico({ busca: "(61) 98530" }, contexto)).toEqual({
      AND: [
        {
          OR: [
            { cliente: { nome: { contains: "(61) 98530", mode: "insensitive" } } },
            { numero: { contains: "(61) 98530", mode: "insensitive" } },
            { cliente: { telefone: { contains: "6198530" } } },
          ],
        },
      ],
    });

    expect(montarWhereListagemOrdensServico({ busca: "Maria" }, contexto)).toEqual({
      AND: [
        {
          OR: [
            { cliente: { nome: { contains: "Maria", mode: "insensitive" } } },
            { numero: { contains: "Maria", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("atrasadas: previsão anterior ao início de hoje e status não encerrado", () => {
    const inicioHoje = new Date("2026-09-16T00:00:00");
    expect(montarWhereListagemOrdensServico({ atrasadas: true }, contexto)).toEqual({
      AND: [
        { status: { notIn: ["CONCLUIDA", "ENTREGUE", "CANCELADA"] } },
        { dataPrevisao: { lt: inicioHoje } },
      ],
    });
  });

  it("combina filtros, busca e atrasadas com AND", () => {
    const where = montarWhereListagemOrdensServico(
      { statusOperacional: "ABERTA", statusFinanceiro: "COM_SALDO_EM_ABERTO", busca: "x", atrasadas: true },
      contexto,
    ) as { AND: unknown[] };
    expect(where.AND).toHaveLength(5);
  });
});

describe("listarOrdensServicoPaginado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa o mesmo where no count e no findMany e aplica skip/take", async () => {
    prismaMock.ordemServico.count.mockResolvedValue(45);
    prismaMock.ordemServico.findMany.mockResolvedValue([ordemBruta("a"), ordemBruta("b")]);

    const resultado = await listarOrdensServicoPaginado({
      filtros: { statusOperacional: "ABERTA", busca: "Cliente" },
      paginacao: normalizarPaginacao({ page: 2, pageSize: 20 }),
      agora: new Date("2026-09-16T10:00:00"),
    });

    const whereCount = prismaMock.ordemServico.count.mock.calls[0][0].where;
    const argsFind = prismaMock.ordemServico.findMany.mock.calls[0][0];

    expect(argsFind.where).toEqual(whereCount);
    expect(argsFind.skip).toBe(20);
    expect(argsFind.take).toBe(20);
    expect(argsFind.orderBy).toEqual([
      { favorita: "desc" },
      { dataEntrada: "desc" },
      { criadoEm: "desc" },
      { id: "desc" },
    ]);

    expect(resultado.pagination).toEqual({ page: 2, pageSize: 20, total: 45, totalPages: 3 });
    expect(resultado.data).toHaveLength(2);
    // Resumo financeiro continua derivado por OS (não vem do where).
    expect(resultado.data[0]).toMatchObject({ id: "a", statusFinanceiro: "PENDENTE", saldo: 100, valorPago: 0 });
  });

  it("última página traz o restante e página além do fim cai para a última", async () => {
    prismaMock.ordemServico.count.mockResolvedValue(45);
    prismaMock.ordemServico.findMany
      .mockResolvedValueOnce([]) // page 9 → vazio
      .mockResolvedValueOnce([ordemBruta("z")]); // refeito na última página

    const resultado = await listarOrdensServicoPaginado({
      filtros: {},
      paginacao: normalizarPaginacao({ page: 9, pageSize: 20 }),
    });

    expect(prismaMock.ordemServico.findMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.ordemServico.findMany.mock.calls[1][0]).toMatchObject({ skip: 40, take: 20 });
    expect(resultado.pagination).toEqual({ page: 3, pageSize: 20, total: 45, totalPages: 3 });
    expect(resultado.data.map((o) => o.id)).toEqual(["z"]);
  });

  it("lista vazia devolve total 0 e totalPages 1", async () => {
    prismaMock.ordemServico.count.mockResolvedValue(0);
    prismaMock.ordemServico.findMany.mockResolvedValue([]);

    const resultado = await listarOrdensServicoPaginado({ filtros: {}, paginacao: normalizarPaginacao({}) });

    expect(resultado).toEqual({ data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
  });
});

describe("contarEstatisticasOrdensServico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("conta abertas, em andamento e com saldo sobre o conjunto completo", async () => {
    prismaMock.ordemServico.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5);

    await expect(contarEstatisticasOrdensServico()).resolves.toEqual({ abertas: 7, emAndamento: 3, comSaldo: 5 });

    expect(prismaMock.ordemServico.count).toHaveBeenNthCalledWith(1, { where: { status: "ABERTA" } });
    expect(prismaMock.ordemServico.count).toHaveBeenNthCalledWith(2, { where: { status: "EM_ANDAMENTO" } });
    expect(prismaMock.ordemServico.count).toHaveBeenNthCalledWith(3, { where: { saldo: { gt: 0 } } });
  });
});
