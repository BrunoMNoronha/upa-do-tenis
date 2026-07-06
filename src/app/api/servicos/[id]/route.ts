import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const servicoId = params.id;

    const count = await prisma.servicoItemOrdem.count({
      where: { servicoId }
    });

    if (count > 0) {
      return NextResponse.json(
        { message: "Este serviço não pode ser excluído porque possui ordens de serviço vinculadas." },
        { status: 409 }
      );
    }

    await prisma.servico.delete({
      where: { id: servicoId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao excluir serviço:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir o serviço." },
      { status: 500 }
    );
  }
}
