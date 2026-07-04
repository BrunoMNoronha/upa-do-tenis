import { NextRequest, NextResponse } from "next/server";
import { obterDetalhesCaixa } from "@/lib/caixa";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caixa = await obterDetalhesCaixa(params.id);
    if (!caixa) {
      return NextResponse.json({ message: "Caixa não encontrado" }, { status: 404 });
    }
    return NextResponse.json(caixa);
  } catch (error) {
    console.error("Erro ao obter detalhes do caixa:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno." },
      { status: 500 }
    );
  }
}
