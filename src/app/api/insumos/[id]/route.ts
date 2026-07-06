import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const insumoId = params.id;

    const count = await prisma.movimentacaoEstoqueInsumo.count({
      where: { insumoId }
    });

    if (count > 0) {
      return NextResponse.json(
        { message: "Este insumo não pode ser excluído porque possui movimentações vinculadas." },
        { status: 409 }
      );
    }

    await prisma.insumo.delete({
      where: { id: insumoId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao excluir insumo:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir o insumo." },
      { status: 500 }
    );
  }
}
