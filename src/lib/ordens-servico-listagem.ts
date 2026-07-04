import { sanitizePhone } from "./sanitizers";

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