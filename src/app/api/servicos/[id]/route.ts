import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { servicoAtualizarSchema } from "@/lib/servicos-schema";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json();
    const result = servicoAtualizarSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const data: { nome?: string; descricao?: string; precoBase?: number; ativo?: boolean } = {};

    if (result.data.nome !== undefined) {
      data.nome = result.data.nome;
    }

    if (result.data.descricao !== undefined) {
      data.descricao = result.data.descricao;
    }

    if (result.data.precoBase !== undefined) {
      data.precoBase = result.data.precoBase;
    }

    if (result.data.ativo !== undefined) {
      data.ativo = result.data.ativo;
    }

    const servicoAtualizado = await prisma.servico.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(servicoAtualizado, { status: 200 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ message: "Serviço não encontrado." }, { status: 404 });
    }

    console.error("Erro ao atualizar serviço:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o serviço." },
      { status: 500 }
    );
  }
}

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
        { message: "Este serviço não pode ser excluído porque possui ordens de serviço vinculadas. Inative-o para tirá-lo de circulação." },
        { status: 409 }
      );
    }

    await prisma.servico.delete({
      where: { id: servicoId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ message: "Serviço não encontrado." }, { status: 404 });
    }

    console.error("Erro ao excluir serviço:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir o serviço." },
      { status: 500 }
    );
  }
}
