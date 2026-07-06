import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

import { ordemServicoIdParamsSchema } from "@/lib/ordens-servico-schema";
import {
  obterDetalheOrdemServico,
  OrdemServicoDetalheError,
} from "@/lib/ordens-servico";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const parsedParams = ordemServicoIdParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          message: "Parâmetros inválidos.",
          errors: parsedParams.error.flatten(),
        },
        { status: 400 },
      );
    }

    const ordemServico = await obterDetalheOrdemServico(parsedParams.data.id);

    return NextResponse.json({ ordemServico });
  } catch (error) {
    if (error instanceof OrdemServicoDetalheError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao buscar detalhe da OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao buscar o detalhe da OS." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const parsedParams = ordemServicoIdParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    }

    const osId = parsedParams.data.id;
    
    const countPagamentos = await prisma.pagamento.count({ where: { ordemServicoId: osId } });
    const countMovEstoque = await prisma.movimentacaoEstoqueInsumo.count({ where: { ordemServicoId: osId } });
    const countMovCaixa = await prisma.movimentacaoCaixa.count({ where: { ordemServicoId: osId } });
    
    const countHistory = await prisma.historicoStatus.count({ 
      where: { 
        ordemServicoId: osId,
        statusAnterior: { not: null } 
      } 
    });

    if (countPagamentos > 0 || countMovEstoque > 0 || countMovCaixa > 0 || countHistory > 0) {
      return NextResponse.json(
        { message: "Esta ordem de serviço não pode ser excluída fisicamente pois possui histórico, pagamentos ou movimentações vinculadas." },
        { status: 409 }
      );
    }

    await prisma.ordemServico.delete({
      where: { id: osId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao excluir OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir a OS." },
      { status: 500 }
    );
  }
}