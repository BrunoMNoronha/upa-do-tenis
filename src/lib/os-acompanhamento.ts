import { prisma } from "@/lib/prisma";
import { verificarTokenAcompanhamento } from "@/lib/os-acompanhamento-token";

/**
 * Consulta pública de acompanhamento da OS (sem sessão administrativa).
 *
 * Contrato mínimo e fechado: número, status, data de entrada e linha do tempo
 * de status. Nada de cliente, valores, pagamentos, observações, usuários,
 * itens ou insumos — o `select` abaixo é a garantia, não o componente.
 */

export type EtapaAcompanhamentoPublico = {
  status: string;
  statusLabel: string;
  data: string;
};

export type AcompanhamentoPublico = {
  numero: string;
  status: string;
  statusLabel: string;
  mensagem: string;
  dataEntrada: string;
  etapas: EtapaAcompanhamentoPublico[];
};

type OrdemParaAcompanhamento = {
  numero: string;
  status: string;
  dataEntrada: Date;
  historicosStatus: { statusAnterior: string | null; statusNovo: string; criadoEm: Date }[];
};

const STATUS_PUBLICO: Record<string, { label: string; mensagem: string }> = {
  ABERTA: {
    label: "Recebida",
    mensagem: "Recebemos seu calçado e a ordem de serviço foi registrada. Em breve ele entra em atendimento.",
  },
  EM_ANDAMENTO: {
    label: "Em andamento",
    mensagem: "Seu calçado está em atendimento na nossa oficina.",
  },
  CONCLUIDA: {
    label: "Pronta para retirada",
    mensagem: "O serviço foi concluído e seu calçado está pronto para retirada.",
  },
  ENTREGUE: {
    label: "Entregue",
    mensagem: "Seu calçado já foi entregue. Obrigado pela confiança!",
  },
  CANCELADA: {
    label: "Cancelada",
    mensagem: "Esta ordem de serviço foi cancelada. Em caso de dúvidas, fale com a sapataria.",
  },
};

const STATUS_DESCONHECIDO = {
  label: "Em processamento",
  mensagem: "Sua ordem de serviço está registrada. Em caso de dúvidas, fale com a sapataria.",
};

function statusPublico(status: string) {
  return STATUS_PUBLICO[status] ?? STATUS_DESCONHECIDO;
}

export function montarAcompanhamentoPublico(ordem: OrdemParaAcompanhamento): AcompanhamentoPublico {
  // A abertura é sempre a data operacional de entrada; o registro de histórico
  // inicial (OS retroativa) carrega a data técnica de digitação e é ignorado.
  const etapas: EtapaAcompanhamentoPublico[] = [
    { status: "ABERTA", statusLabel: statusPublico("ABERTA").label, data: ordem.dataEntrada.toISOString() },
    ...[...ordem.historicosStatus]
      .filter((historico) => historico.statusAnterior !== null)
      .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())
      .map((historico) => ({
        status: historico.statusNovo,
        statusLabel: statusPublico(historico.statusNovo).label,
        data: historico.criadoEm.toISOString(),
      })),
  ];

  const atual = statusPublico(ordem.status);

  return {
    numero: ordem.numero,
    status: ordem.status,
    statusLabel: atual.label,
    mensagem: atual.mensagem,
    dataEntrada: ordem.dataEntrada.toISOString(),
    etapas,
  };
}

/** `null` para token inválido, adulterado ou de OS inexistente — o chamador não distingue. */
export async function obterAcompanhamentoPublico(token: string): Promise<AcompanhamentoPublico | null> {
  const ordemServicoId = verificarTokenAcompanhamento(token);

  if (!ordemServicoId) {
    return null;
  }

  const ordem = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    select: {
      numero: true,
      status: true,
      dataEntrada: true,
      historicosStatus: {
        select: { statusAnterior: true, statusNovo: true, criadoEm: true },
        orderBy: { criadoEm: "asc" },
      },
    },
  });

  return ordem ? montarAcompanhamentoPublico(ordem) : null;
}
