import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clienteId = params.id;

    const count = await prisma.ordemServico.count({
      where: { clienteId }
    });

    if (count > 0) {
      return NextResponse.json(
        { message: "Este cliente não pode ser excluído porque possui ordens de serviço vinculadas." },
        { status: 409 }
      );
    }

    await prisma.cliente.delete({
      where: { id: clienteId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir o cliente." },
      { status: 500 }
    );
  }
}
