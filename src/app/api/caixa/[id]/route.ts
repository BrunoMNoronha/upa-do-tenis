import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { obterDetalhesCaixa } from "@/lib/caixa";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

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
