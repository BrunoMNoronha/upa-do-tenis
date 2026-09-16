import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { statusUpdateSchema } from "@/lib/ordens-servico-schema";
import { OsStatus, transicaoPermitida } from "@/lib/ordens-servico-status";
import { prisma } from "@/lib/prisma";

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
    if (!transicaoPermitida(statusAtual, novo)) {
      return NextResponse.json(
        { message: `Transição inválida: Não é possível mudar de ${statusAtual} para ${statusNovo}.` },
        { status: 400 }
      );
    }

    // Definir dataConclusao se aplicável
    const isConcluida = statusNovo === "CONCLUIDA";

    // Executar transação atômica
    const osAtualizada = await prisma.$transaction(async (tx) => {
      // 1. Atualiza OS condicionada ao status lido acima. Se outro operador
      //    alterou o status entre a leitura e a gravação, nenhuma linha é
      //    afetada e a transição é rejeitada (estado persistido prevalece).
      const resultado = await tx.ordemServico.updateMany({
        where: { id, status: statusAtual },
        data: {
          status: statusNovo,
          dataConclusao: isConcluida ? new Date() : osAtual.dataConclusao,
        },
      });

      if (resultado.count === 0) {
        return null;
      }

      // 2. Cria registro de Histórico
      await tx.historicoStatus.create({
        data: {
          ordemServicoId: id,
          statusAnterior: statusAtual,
          statusNovo: statusNovo,
          observacao: observacao,
        },
      });

      return tx.ordemServico.findUnique({ where: { id } });
    });

    if (!osAtualizada) {
      return NextResponse.json(
        { message: "A ordem de serviço foi alterada por outro operador. Atualize a página e tente novamente." },
        { status: 409 }
      );
    }

    return NextResponse.json(osAtualizada, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar status da OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o status." },
      { status: 500 }
    );
  }
}
