import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { formaPagamentoAtualizarSchema } from "@/lib/formas-pagamento-schema";
import { prisma } from "@/lib/prisma";

/**
 * Conta o movimento financeiro já vinculado a uma forma de pagamento.
 * As três relações são onDelete: Restrict no schema.
 */
async function contarMovimento(formaPagamentoId: string) {
  const [pagamentos, vendas, movimentacoesCaixa] = await Promise.all([
    prisma.pagamento.count({ where: { formaPagamentoId } }),
    prisma.venda.count({ where: { formaPagamentoId } }),
    prisma.movimentacaoCaixa.count({ where: { formaPagamentoId } }),
  ]);

  return pagamentos + vendas + movimentacoesCaixa;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json();
    const result = formaPagamentoAtualizarSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const formaAtual = await prisma.formaPagamento.findUnique({
      where: { id: params.id },
      select: { tipo: true },
    });

    if (!formaAtual) {
      return NextResponse.json({ message: "Forma de pagamento não encontrada." }, { status: 404 });
    }

    // O fechamento de caixa identifica dinheiro físico comparando `tipo` com
    // "DINHEIRO" (ver src/lib/caixa.ts). Trocar o tipo de uma forma que já tem
    // movimento reescreveria retroativamente o caixa de dias fechados.
    const alterandoTipo = result.data.tipo !== undefined && result.data.tipo !== formaAtual.tipo;

    if (alterandoTipo && (await contarMovimento(params.id)) > 0) {
      return NextResponse.json(
        {
          message:
            "O tipo não pode ser alterado porque esta forma de pagamento já possui pagamentos, vendas ou movimentações de caixa registrados — a mudança reescreveria o fechamento de caixa. Inative-a e cadastre uma nova forma com o tipo correto.",
        },
        { status: 409 }
      );
    }

    const data: { nome?: string; tipo?: string; ativo?: boolean } = {};

    if (result.data.nome !== undefined) {
      data.nome = result.data.nome;
    }

    if (alterandoTipo && result.data.tipo !== undefined) {
      data.tipo = result.data.tipo;
    }

    if (result.data.ativo !== undefined) {
      data.ativo = result.data.ativo;
    }

    const formaAtualizada = await prisma.formaPagamento.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(formaAtualizada, { status: 200 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ message: "Forma de pagamento não encontrada." }, { status: 404 });
    }

    console.error("Erro ao atualizar forma de pagamento:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar a forma de pagamento." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    if ((await contarMovimento(params.id)) > 0) {
      return NextResponse.json(
        {
          message:
            "Esta forma de pagamento não pode ser excluída porque possui pagamentos, vendas ou movimentações de caixa vinculados. Inative-a para tirá-la de circulação.",
        },
        { status: 409 }
      );
    }

    await prisma.formaPagamento.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ message: "Forma de pagamento não encontrada." }, { status: 404 });
    }

    console.error("Erro ao excluir forma de pagamento:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir a forma de pagamento." },
      { status: 500 }
    );
  }
}
