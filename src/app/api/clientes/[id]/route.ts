import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { atualizarCliente } from "@/lib/clientes";
import { clienteAtualizarSchema } from "@/lib/clientes-schema";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json();
    const result = clienteAtualizarSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const clienteAtualizado = await atualizarCliente(params.id, result.data);

    return NextResponse.json(clienteAtualizado, { status: 200 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ message: "Cliente não encontrado." }, { status: 404 });
    }

    console.error("Erro ao atualizar cliente:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o cliente." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const clienteId = params.id;

    // OrdemServico é onDelete: Restrict; Venda é onDelete: SetNull — sem esta
    // contagem, excluir um cliente com vendas apagaria o vínculo silenciosamente
    // e o histórico financeiro perderia a identificação do comprador.
    const [ordensServico, vendas] = await Promise.all([
      prisma.ordemServico.count({ where: { clienteId } }),
      prisma.venda.count({ where: { clienteId } }),
    ]);

    if (ordensServico > 0 || vendas > 0) {
      return NextResponse.json(
        { message: "Este cliente não pode ser excluído porque possui ordens de serviço ou vendas vinculadas. Inative-o para tirá-lo de circulação." },
        { status: 409 }
      );
    }

    await prisma.cliente.delete({
      where: { id: clienteId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ message: "Cliente não encontrado." }, { status: 404 });
    }

    console.error("Erro ao excluir cliente:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir o cliente." },
      { status: 500 }
    );
  }
}
