import { NextRequest, NextResponse } from "next/server";
import { obterVendaPorId } from "@/lib/vendas";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venda = await obterVendaPorId(params.id);

    if (!venda) {
      return NextResponse.json(
        { message: "Venda não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(venda, { status: 200 });
  } catch (error) {
    console.error("Erro ao obter detalhes da venda:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao buscar os detalhes da venda." },
      { status: 500 }
    );
  }
}
