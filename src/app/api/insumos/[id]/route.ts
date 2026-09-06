import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { insumoAtualizarSchema } from "@/lib/insumos-schema";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json();
    const result = insumoAtualizarSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    // `quantidadeEstoque` não entra aqui: o saldo só muda pela rota de
    // movimentações, que registra o extrato.
    const data: {
      nome?: string;
      descricao?: string;
      unidadeMedida?: string;
      estoqueMinimo?: number;
      custoUnitario?: number;
      ativo?: boolean;
    } = {};

    if (result.data.nome !== undefined) {
      data.nome = result.data.nome;
    }

    if (result.data.descricao !== undefined) {
      data.descricao = result.data.descricao;
    }

    if (result.data.unidadeMedida !== undefined) {
      data.unidadeMedida = result.data.unidadeMedida;
    }

    if (result.data.estoqueMinimo !== undefined) {
      data.estoqueMinimo = result.data.estoqueMinimo;
    }

    if (result.data.custoUnitario !== undefined) {
      data.custoUnitario = result.data.custoUnitario;
    }

    if (result.data.ativo !== undefined) {
      data.ativo = result.data.ativo;
    }

    const insumoAtualizado = await prisma.insumo.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(insumoAtualizado, { status: 200 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ message: "Insumo não encontrado." }, { status: 404 });
    }

    console.error("Erro ao atualizar insumo:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o insumo." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const insumoId = params.id;

    // Ambas as relações são onDelete: Restrict no schema. Contar as duas evita
    // que um insumo consumido em OS sem movimentação estoure P2003 e vire 500.
    const [movimentacoes, itensOrdem] = await Promise.all([
      prisma.movimentacaoEstoqueInsumo.count({ where: { insumoId } }),
      prisma.insumoItemOrdem.count({ where: { insumoId } }),
    ]);

    if (movimentacoes > 0 || itensOrdem > 0) {
      return NextResponse.json(
        { message: "Este insumo não pode ser excluído porque possui movimentações ou consumo em ordens de serviço vinculados. Inative-o para tirá-lo de circulação." },
        { status: 409 }
      );
    }

    await prisma.insumo.delete({
      where: { id: insumoId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ message: "Insumo não encontrado." }, { status: 404 });
    }

    console.error("Erro ao excluir insumo:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir o insumo." },
      { status: 500 }
    );
  }
}
