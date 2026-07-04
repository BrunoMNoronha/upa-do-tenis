import { NextRequest, NextResponse } from "next/server";
import { listarCaixas, abrirCaixa, CaixaError } from "@/lib/caixa";
import { abrirCaixaSchema } from "@/lib/caixa-schema";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const take = searchParams.get("take") ? parseInt(searchParams.get("take")!, 10) : undefined;
    const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : undefined;
    const dataInicio = searchParams.get("dataInicio") || undefined;
    const dataFim = searchParams.get("dataFim") || undefined;
    
    const caixas = await listarCaixas({ take, skip, dataInicio, dataFim });
    return NextResponse.json(caixas);
  } catch (error) {
    console.error("Erro ao listar caixas:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao listar caixas." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = abrirCaixaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const caixa = await abrirCaixa(parsed.data);
    return NextResponse.json(caixa, { status: 201 });
  } catch (error) {
    if (error instanceof CaixaError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Erro ao abrir caixa:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao abrir o caixa." },
      { status: 500 }
    );
  }
}
