import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { listarCaixasPaginado, abrirCaixa, CaixaError } from "@/lib/caixa";
import { abrirCaixaSchema } from "@/lib/caixa-schema";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    // Paginação server-side padronizada (?page&pageSize) com filtro de
    // período. Resposta no contrato { data, pagination }.
    const searchParams = req.nextUrl.searchParams;
    const dataInicio = searchParams.get("dataInicio") || undefined;
    const dataFim = searchParams.get("dataFim") || undefined;

    const resultado = await listarCaixasPaginado({
      dataInicio,
      dataFim,
      paginacao: lerPaginacaoDeSearchParams(searchParams),
    });
    return NextResponse.json(resultado);
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
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

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
