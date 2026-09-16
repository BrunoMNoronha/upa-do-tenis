import { sanitizePhone } from "./sanitizers";

export type StatusOperacionalListagem = "TODAS" | "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ENTREGUE" | "CANCELADA";

export type StatusFinanceiroListagem =
  | "TODAS"
  | "PENDENTES"
  | "PARCIAIS"
  | "PAGAS"
  | "COM_SALDO_EM_ABERTO";

type OrdemServicoListagem = {
  status: string;
  statusFinanceiro?: string;
  saldo?: number;
};

export function filtrarOrdensServicoListagem<T extends OrdemServicoListagem>(params: {
  ordens: T[];
  statusOperacional: StatusOperacionalListagem;
  statusFinanceiro: StatusFinanceiroListagem;
}) {
  return params.ordens.filter((ordem) => {
    const matchOperacional =
      params.statusOperacional === "TODAS" ? true : ordem.status === params.statusOperacional;

    const statusFinanceiro = (ordem.statusFinanceiro ?? "").toUpperCase();
    const saldo = Number(ordem.saldo ?? 0);

    const matchFinanceiro = (() => {
      if (params.statusFinanceiro === "TODAS") {
        return true;
      }

      if (params.statusFinanceiro === "PENDENTES") {
        return statusFinanceiro === "PENDENTE";
      }

      if (params.statusFinanceiro === "PARCIAIS") {
        return statusFinanceiro === "PARCIAL";
      }

      if (params.statusFinanceiro === "PAGAS") {
        return statusFinanceiro === "PAGO";
      }

      return saldo > 0;
    })();

    return matchOperacional && matchFinanceiro;
  });
}

type OrdemServicoBusca = {
  numero?: string | null;
  cliente?: { nome?: string | null; telefone?: string | null } | null;
};

/**
 * Verifica se uma OS corresponde ao termo de busca digitado.
 * Mantém a busca parcial por nome do cliente e por número da OS, e
 * acrescenta a busca por telefone do cliente normalizado (somente dígitos),
 * de modo que "61985307168" encontre "(61) 98530-7168".
 */
export function ordemServicoCorrespondeBusca(ordem: OrdemServicoBusca, termo: string): boolean {
  const termoLimpo = termo.trim().toLowerCase();
  if (!termoLimpo) {
    return true;
  }

  const nome = (ordem.cliente?.nome ?? "").toLowerCase();
  const numero = (ordem.numero ?? "").toLowerCase();
  const matchCliente = nome.includes(termoLimpo);
  const matchNumero = numero.includes(termoLimpo);

  const termoDigitos = termoLimpo.replace(/\D/g, "");
  const telefoneDigitos = sanitizePhone(ordem.cliente?.telefone);
  const matchTelefone = termoDigitos.length > 0 && telefoneDigitos.includes(termoDigitos);

  return matchCliente || matchNumero || matchTelefone;
}
export type FiltrosListagemOrdensServico = {
  statusOperacional?: StatusOperacionalListagem;
  statusFinanceiro?: StatusFinanceiroListagem;
  busca?: string;
  atrasadas?: boolean;
};

const STATUS_OPERACIONAIS: StatusOperacionalListagem[] = [
  "TODAS",
  "ABERTA",
  "EM_ANDAMENTO",
  "CONCLUIDA",
  "ENTREGUE",
  "CANCELADA",
];

const STATUS_FINANCEIROS: StatusFinanceiroListagem[] = [
  "TODAS",
  "PENDENTES",
  "PARCIAIS",
  "PAGAS",
  "COM_SALDO_EM_ABERTO",
];

/** Status operacionais que não contam como atrasados (fluxo encerrado). */
export const STATUS_ENCERRADOS = ["CONCLUIDA", "ENTREGUE", "CANCELADA"] as const;

/**
 * Normaliza os filtros vindos da query string. Valores desconhecidos caem
 * para "TODAS"/falso para nunca derrubar a listagem por URL malformada.
 */
export function normalizarFiltrosListagemOrdensServico(
  entrada: Record<string, string | string[] | undefined> | URLSearchParams,
): Required<FiltrosListagemOrdensServico> {
  const ler = (chave: string): string => {
    if (entrada instanceof URLSearchParams) {
      return entrada.get(chave) ?? "";
    }
    const valor = entrada[chave];
    return typeof valor === "string" ? valor : "";
  };

  const statusOp = ler("statusOp").toUpperCase() as StatusOperacionalListagem;
  const statusFin = ler("statusFin").toUpperCase() as StatusFinanceiroListagem;

  return {
    statusOperacional: STATUS_OPERACIONAIS.includes(statusOp) ? statusOp : "TODAS",
    statusFinanceiro: STATUS_FINANCEIROS.includes(statusFin) ? statusFin : "TODAS",
    busca: ler("busca").trim(),
    atrasadas: ler("atrasadas") === "true",
  };
}

/**
 * Monta o `where` do Prisma equivalente aos filtros aplicados até então em
 * memória (`filtrarOrdensServicoListagem` + `ordemServicoCorrespondeBusca` +
 * regra de atraso da tela). É usado tanto no `findMany` quanto no `count`,
 * garantindo que a contagem e a página vejam exatamente o mesmo conjunto.
 *
 * O filtro financeiro usa as colunas persistidas `valorPago`, `valorTotal` e
 * `saldo`, mantidas em sincronia pelas APIs de pagamento e edição de OS. O
 * resumo financeiro exibido em cada OS continua sendo o derivado por
 * `calcularResumoFinanceiroOS` — esta função não altera nenhum cálculo.
 *
 * `referencias.valorTotal` recebe `prisma.ordemServico.fields.valorTotal`
 * para permitir a comparação coluna-a-coluna (valorPago < valorTotal).
 */
export function montarWhereListagemOrdensServico(
  filtros: FiltrosListagemOrdensServico,
  contexto: { agora: Date; referencias: { valorTotal: unknown } },
): Record<string, unknown> {
  const condicoes: Record<string, unknown>[] = [];

  if (filtros.statusOperacional && filtros.statusOperacional !== "TODAS") {
    condicoes.push({ status: filtros.statusOperacional });
  }

  switch (filtros.statusFinanceiro) {
    case "PENDENTES":
      condicoes.push({ status: { not: "CANCELADA" } }, { valorPago: { lte: 0 } });
      break;
    case "PARCIAIS":
      condicoes.push(
        { status: { not: "CANCELADA" } },
        { valorPago: { gt: 0 } },
        { valorPago: { lt: contexto.referencias.valorTotal } },
      );
      break;
    case "PAGAS":
      condicoes.push(
        { status: { not: "CANCELADA" } },
        { valorPago: { gt: 0 } },
        { valorPago: { gte: contexto.referencias.valorTotal } },
      );
      break;
    case "COM_SALDO_EM_ABERTO":
      condicoes.push({ saldo: { gt: 0 } });
      break;
    default:
      break;
  }

  const termo = (filtros.busca ?? "").trim();
  if (termo) {
    const termoDigitos = termo.replace(/\D/g, "");
    condicoes.push({
      OR: [
        { cliente: { nome: { contains: termo, mode: "insensitive" } } },
        { numero: { contains: termo, mode: "insensitive" } },
        ...(termoDigitos ? [{ cliente: { telefone: { contains: termoDigitos } } }] : []),
      ],
    });
  }

  if (filtros.atrasadas) {
    const inicioHoje = new Date(contexto.agora);
    inicioHoje.setHours(0, 0, 0, 0);
    condicoes.push(
      { status: { notIn: [...STATUS_ENCERRADOS] } },
      // Uma OS está atrasada quando o fim do dia da previsão já passou, ou
      // seja, quando a previsão é anterior ao início de hoje.
      { dataPrevisao: { lt: inicioHoje } },
    );
  }

  if (condicoes.length === 0) {
    return {};
  }

  return { AND: condicoes };
}

type OrdemServicoPrazo = {
  status: string;
  dataPrevisao: Date | string | null | undefined;
};

/**
 * Uma OS está atrasada quando o fluxo não foi encerrado (`STATUS_ENCERRADOS`)
 * e o dia previsto já terminou (horário local). Uma OS com previsão para hoje
 * ainda não é considerada atrasada. Mesma regra do filtro `atrasadas` em
 * `montarWhereListagemOrdensServico`.
 */
export function ordemServicoEstaAtrasada(ordem: OrdemServicoPrazo, agora: Date = new Date()): boolean {
  if ((STATUS_ENCERRADOS as readonly string[]).includes(ordem.status) || !ordem.dataPrevisao) {
    return false;
  }

  const fimDoDiaPrevisto = new Date(ordem.dataPrevisao);
  if (Number.isNaN(fimDoDiaPrevisto.getTime())) {
    return false;
  }
  fimDoDiaPrevisto.setHours(23, 59, 59, 999);

  return fimDoDiaPrevisto < agora;
}
