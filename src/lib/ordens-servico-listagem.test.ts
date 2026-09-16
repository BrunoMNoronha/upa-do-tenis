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

  it("ordena favoritas primeiro e, dentro de cada grupo, pela data operacional com criadoEm como desempate", async () => {
    prismaMock.ordemServico.findMany.mockResolvedValueOnce([]);

    await listarOrdensServico();

    expect(prismaMock.ordemServico.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ favorita: "desc" }, { dataEntrada: "desc" }, { criadoEm: "desc" }],
      }),
    );
  });

  describe("favoritas no topo (issue #153)", () => {
    type Chave = "favorita" | "dataEntrada" | "criadoEm";
    type OrdemBase = {
      id: string;
      favorita: boolean;
      dataEntrada: Date;
      criadoEm: Date;
      status: string;
      numero: string;
      cliente: { nome: string; telefone: string };
      valorTotal: number;
      valorDesconto: number;
      valorSinal: number;
      valorPago: number;
      pagamentos: never[];
      itens: never[];
    };

    /**
     * Aplica ao fixture o mesmo orderBy que o Prisma envia ao banco, para
     * validar o resultado que a listagem entrega (o findMany é mockado).
     * Postgres ordena boolean DESC como true > false.
     */
    function ordenarComoBanco<T extends Record<Chave, unknown>>(
      ordens: T[],
      orderBy: Array<Partial<Record<Chave, "asc" | "desc">>>,
    ) {
      return [...ordens].sort((a, b) => {
        for (const criterio of orderBy) {
          const [chave, direcao] = Object.entries(criterio)[0] as [Chave, "asc" | "desc"];
          const va = a[chave] instanceof Date ? (a[chave] as Date).getTime() : Number(a[chave]);
          const vb = b[chave] instanceof Date ? (b[chave] as Date).getTime() : Number(b[chave]);
          if (va === vb) continue;
          return direcao === "desc" ? vb - va : va - vb;
        }
        return 0;
      });
    }

    function ordem(id: string, favorita: boolean, dataEntrada: string, status = "ABERTA"): OrdemBase {
      return {
        id,
        numero: `OS-${id}`,
        favorita,
        status,
        dataEntrada: new Date(`${dataEntrada}T12:00:00Z`),
        criadoEm: new Date(`${dataEntrada}T12:00:00Z`),
        cliente: { nome: `Cliente ${id}`, telefone: "61985307168" },
        valorTotal: 100,
        valorDesconto: 0,
        valorSinal: 0,
        valorPago: 0,
        pagamentos: [],
        itens: [],
      };
    }

    // Cadastro em ordem A..E; pela regra vigente (dataEntrada desc) a lista
    // sem favoritos seria E, D, C, B, A.
    const fixture = [
      ordem("A", false, "2026-09-01"),
      ordem("B", true, "2026-09-02", "CONCLUIDA"),
      ordem("C", false, "2026-09-03"),
      ordem("D", true, "2026-09-04"),
      ordem("E", false, "2026-09-05"),
    ];

    async function listarComFixture() {
      prismaMock.ordemServico.findMany.mockImplementationOnce(async (args: any) =>
        ordenarComoBanco(fixture, args.orderBy),
      );
      return listarOrdensServico();
    }

    it("mantém a ordenação vigente quando nenhuma OS é favorita", async () => {
      prismaMock.ordemServico.findMany.mockImplementationOnce(async (args: any) =>
        ordenarComoBanco(
          fixture.map((o) => ({ ...o, favorita: false })),
          args.orderBy,
        ),
      );

      const ordens = await listarOrdensServico();

      expect(ordens.map((o) => o.id)).toEqual(["E", "D", "C", "B", "A"]);
    });

    it("coloca favoritas no topo preservando a ordenação vigente em cada grupo", async () => {
      const ordens = await listarComFixture();

      expect(ordens.map((o) => o.id)).toEqual(["D", "B", "E", "C", "A"]);
      expect(ordens.map((o) => o.favorita)).toEqual([true, true, false, false, false]);
    });

    it("uma OS que estaria no fim da lista sobe para o topo ao ser favoritada (conjunto completo, não só página)", async () => {
      prismaMock.ordemServico.findMany.mockImplementationOnce(async (args: any) =>
        ordenarComoBanco(
          fixture.map((o) => ({ ...o, favorita: o.id === "A" })),
          args.orderBy,
        ),
      );

      const ordens = await listarOrdensServico();

      expect(ordens.map((o) => o.id)).toEqual(["A", "E", "D", "C", "B"]);
    });

    it("favorito não fura o filtro de status operacional", async () => {
      const ordens = await listarComFixture();

      const abertas = filtrarOrdensServicoListagem({
        ordens,
        statusOperacional: "ABERTA",
        statusFinanceiro: "TODAS",
      });

      // B é favorita mas CONCLUIDA: não aparece. D (favorita) segue no topo.
      expect(abertas.map((o) => o.id)).toEqual(["D", "E", "C", "A"]);

      const concluidas = filtrarOrdensServicoListagem({
        ordens,
        statusOperacional: "CONCLUIDA",
        statusFinanceiro: "TODAS",
      });
      expect(concluidas.map((o) => o.id)).toEqual(["B"]);
    });

    it("favorito não fura o filtro financeiro", async () => {
      prismaMock.ordemServico.findMany.mockImplementationOnce(async (args: any) =>
        ordenarComoBanco(
          fixture.map((o) => (o.id === "D" ? { ...o, valorPago: 100 } : o)),
          args.orderBy,
        ),
      );
      const ordens = await listarOrdensServico();

      const pendentes = filtrarOrdensServicoListagem({
        ordens,
        statusOperacional: "TODAS",
        statusFinanceiro: "PENDENTES",
      });

      // D é favorita mas está paga: sai do filtro; B continua no topo.
      expect(pendentes.map((o) => o.id)).toEqual(["B", "E", "C", "A"]);
    });

    it("favorito não fura a busca por número/cliente/telefone", async () => {
      const ordens = await listarComFixture();

      const porNumero = ordens.filter((o) => ordemServicoCorrespondeBusca(o, "OS-C"));
      expect(porNumero.map((o) => o.id)).toEqual(["C"]);

      const porCliente = ordens.filter((o) => ordemServicoCorrespondeBusca(o, "cliente e"));
      expect(porCliente.map((o) => o.id)).toEqual(["E"]);

      // Busca ampla: mantém favoritas no topo dentro do conjunto correspondente.
      const ampla = ordens.filter((o) => ordemServicoCorrespondeBusca(o, "cliente"));
      expect(ampla.map((o) => o.id)).toEqual(["D", "B", "E", "C", "A"]);
    });

    it("expõe o campo favorita normalizado para o client", async () => {
      const ordens = await listarComFixture();

      const porId = Object.fromEntries(ordens.map((o) => [o.id, o.favorita]));
      expect(porId).toEqual({ A: false, B: true, C: false, D: true, E: false });
    });
  });
});
