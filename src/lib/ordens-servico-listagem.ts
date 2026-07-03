export type StatusOperacionalListagem = "TODAS" | "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ENTREGUE";

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