import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { produtoFormSchema } from "@/lib/produtos-schema";
import { listarProdutos } from "@/lib/produtos";
import {
  criarProdutoComEstoqueInicial,
  MovimentacaoEstoqueProdutoError,
} from "@/lib/movimentacao-estoque-produto-service";

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const produtos = await listarProdutos();
    return NextResponse.json(produtos, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao listar os produtos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json();
    const result = produtoFormSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const novoProduto = await criarProdutoComEstoqueInicial(result.data);

    return NextResponse.json(novoProduto, { status: 201 });
  } catch (error) {
    if (error instanceof MovimentacaoEstoqueProdutoError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao criar produto:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar o produto." },
      { status: 500 }
    );
  }
}
