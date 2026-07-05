import { NextRequest, NextResponse } from "next/server";

import { registrarVendaBalcaoSchema } from "@/lib/vendas-schema";
import { registrarVendaBalcao, VendaBalcaoError } from "@/lib/vendas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registrarVendaBalcaoSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 },
      );
    }

    const venda = await registrarVendaBalcao(result.data);

    return NextResponse.json(venda, { status: 201 });
  } catch (error) {
    if (error instanceof VendaBalcaoError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    console.error("Erro ao registrar venda de balcão:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao registrar a venda." },
      { status: 500 },
    );
  }
}
