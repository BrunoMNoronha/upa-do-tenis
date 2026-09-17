import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi, obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { CaixaError } from "@/lib/caixa";
import { MovimentacaoEstoqueProdutoError } from "@/lib/movimentacao-estoque-produto-service";
import { VendaBalcaoError } from "@/lib/vendas";
import { cancelarVendaBalcao } from "@/lib/vendas-cancelamento";
import { cancelarVendaBalcaoSchema } from "@/lib/vendas-cancelamento-schema";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json().catch(() => null);
    const parsed = cancelarVendaBalcaoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const usuario = await obterUsuarioSessaoDaRequest(req);
    if (!usuario) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const venda = await cancelarVendaBalcao(id, parsed.data, usuario.id);

    return NextResponse.json(venda, { status: 200 });
  } catch (error) {
    if (
      error instanceof VendaBalcaoError ||
      error instanceof CaixaError ||
      error instanceof MovimentacaoEstoqueProdutoError
    ) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao cancelar venda de balcão:", error);
    return NextResponse.json({ message: "Ocorreu um erro interno ao cancelar a venda." }, { status: 500 });
  }
}
