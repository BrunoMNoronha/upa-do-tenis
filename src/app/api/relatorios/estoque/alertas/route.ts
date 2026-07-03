import { NextRequest, NextResponse } from "next/server";
import { getResumoAlertasEstoque } from "@/lib/relatorio-estoque-service";

export async function GET(request: NextRequest) {
  try {
    const alertas = await getResumoAlertasEstoque();
    return NextResponse.json(alertas);
  } catch (error: any) {
    console.error("Erro ao buscar alertas:", error);
    return NextResponse.json({ error: "Erro ao buscar alertas" }, { status: 500 });
  }
}
