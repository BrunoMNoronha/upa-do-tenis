import { NextRequest, NextResponse } from "next/server";
import { produtoAtualizarSchema } from "@/lib/produtos-schema";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const result = produtoAtualizarSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const data: {
      nome?: string;
      descricao?: string;
      precoVenda?: number;
      ativo?: boolean;
    } = {};

    if (result.data.nome !== undefined) {
      data.nome = result.data.nome;
    }

    if (result.data.descricao !== undefined) {
      data.descricao = result.data.descricao;
    }

    if (result.data.precoVenda !== undefined) {
      data.precoVenda = result.data.precoVenda;
    }

    if (result.data.ativo !== undefined) {
      data.ativo = result.data.ativo;
    }

    const produtoAtualizado = await prisma.produto.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(produtoAtualizado, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { message: "Produto não encontrado." },
        { status: 404 }
      );
    }

    console.error("Erro ao atualizar produto:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o produto." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const count = await prisma.itemVenda.count({
      where: { produtoId: params.id },
    });

    if (count > 0) {
      return NextResponse.json(
        {
          message:
            "Este produto não pode ser excluído porque possui vendas vinculadas. Inative-o para tirá-lo de circulação.",
        },
        { status: 409 }
      );
    }

    await prisma.produto.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { message: "Produto não encontrado." },
        { status: 404 }
      );
    }

    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir o produto." },
      { status: 500 }
    );
  }
}
