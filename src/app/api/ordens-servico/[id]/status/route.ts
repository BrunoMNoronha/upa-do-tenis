import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { statusUpdateSchema } from "@/lib/ordens-servico-schema";
import {
  MENSAGEM_CANCELAMENTO_NAO_PERMITIDO,
  OsStatus,
  transicoesPermitidas,
} from "@/lib/ordens-servico";
import { prisma } from "@/lib/prisma";

class TransicaoStatusConflitoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransicaoStatusConflitoError";
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    if (!id) {
      return NextResponse.json({ message: "ID da Ordem de Serviço não informado." }, { status: 400 });
    }

    const body = await req.json();
    const result = statusUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { statusNovo, observacao } = result.data;

    // Buscar OS atual
    const osAtual = await prisma.ordemServico.findUnique({
      where: { id },
    });

    if (!osAtual) {
      return NextResponse.json({ message: "Ordem de serviço não encontrada." }, { status: 404 });
    }

    const statusAtual = osAtual.status as OsStatus;
    const novo = statusNovo as OsStatus;

    // Validar se transição é permitida
    const transicoesDaAtual = transicoesPermitidas[statusAtual] || [];
    if (!transicoesDaAtual.includes(novo)) {
      const mensagem = novo === "CANCELADA"
        ? MENSAGEM_CANCELAMENTO_NAO_PERMITIDO
        : `Transição inválida: Não é possível mudar de ${statusAtual} para ${statusNovo}.`;
      return NextResponse.json({ message: mensagem }, { status: 400 });
    }

    // Definir dataConclusao se aplicável
    const isConcluida = statusNovo === "CONCLUIDA";

    // Executar transação atômica
    const osAtualizada = await prisma.$transaction(async (tx) => {
      // 1. Atualiza OS condicionada ao status lido: se outra requisição mudou
      //    o status entre a leitura e a escrita (tela obsoleta), nada é alterado.
      const resultado = await tx.ordemServico.updateMany({
        where: { id, status: statusAtual },
        data: {
          status: statusNovo,
          dataConclusao: isConcluida ? new Date() : osAtual.dataConclusao,
        },
      });

      if (resultado.count !== 1) {
        throw new TransicaoStatusConflitoError(
          novo === "CANCELADA"
            ? MENSAGEM_CANCELAMENTO_NAO_PERMITIDO
            : "A ordem de serviço foi alterada por outra operação. Recarregue e tente novamente.",
        );
      }

      const osUpdated = await tx.ordemServico.findUniqueOrThrow({ where: { id } });

      // 2. Cria registro de Histórico
      await tx.historicoStatus.create({
        data: {
          ordemServicoId: id,
          statusAnterior: statusAtual,
          statusNovo: statusNovo,
          observacao: observacao,
        },
      });

      return osUpdated;
    });

    return NextResponse.json(osAtualizada, { status: 200 });
  } catch (error) {
    if (error instanceof TransicaoStatusConflitoError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    console.error("Erro ao atualizar status da OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o status." },
      { status: 500 }
    );
  }
}
