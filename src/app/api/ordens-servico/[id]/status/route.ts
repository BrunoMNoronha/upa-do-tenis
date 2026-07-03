import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { statusUpdateSchema } from "@/lib/ordens-servico-schema";
import { OsStatus, transicoesPermitidas } from "@/lib/ordens-servico";

const prisma = new PrismaClient();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
      return NextResponse.json(
        { message: `Transição inválida: Não é possível mudar de ${statusAtual} para ${statusNovo}.` },
        { status: 400 }
      );
    }

    // Definir dataConclusao se aplicável
    const isConcluida = statusNovo === "CONCLUIDA";

    // Executar transação atômica
    const osAtualizada = await prisma.$transaction(async (tx) => {
      // 1. Atualiza OS
      const osUpdated = await tx.ordemServico.update({
        where: { id },
        data: {
          status: statusNovo,
          dataConclusao: isConcluida ? new Date() : osAtual.dataConclusao,
        },
      });

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
    console.error("Erro ao atualizar status da OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o status." },
      { status: 500 }
    );
  }
}
