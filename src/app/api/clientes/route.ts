import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi } from "@/lib/auth-server";
import { criarCliente, listarClientesPaginado } from "@/lib/clientes";
import { clienteFormSchema } from "@/lib/clientes-schema";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";

export async function GET(request: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(request);
    if (naoAutenticado) return naoAutenticado;

    // Paginação server-side: ?page=2&pageSize=20&search=nome. A busca é
    // aplicada igualmente no count e na página. Resposta { data, pagination }.
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const resultado = await listarClientesPaginado({
      search,
      paginacao: lerPaginacaoDeSearchParams(searchParams),
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao listar os clientes." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(request);
    if (naoAutenticado) return naoAutenticado;

    const payload = await request.json();
    const parsed = clienteFormSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Revise os campos do cliente.",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const cliente = await criarCliente(parsed.data);

    return NextResponse.json({ cliente }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { message: "Já existe um cliente cadastrado com este e-mail ou CPF/CNPJ." },
        { status: 409 }
      );
    }

    console.error("Erro ao criar cliente:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar o cliente." },
      { status: 500 }
    );
  }
}
