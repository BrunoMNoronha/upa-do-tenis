import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi } from "@/lib/auth-server";
import { listarOpcoesCadastroOSComCache } from "@/lib/dados-cache";

export async function GET(request: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(request);
    if (naoAutenticado) {
      naoAutenticado.headers.set("Cache-Control", "private, no-store");
      return naoAutenticado;
    }

    const opcoes = await listarOpcoesCadastroOSComCache();
    return NextResponse.json(opcoes, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (erro) {
    console.error("Erro ao listar opções do cadastro de OS:", erro);
    return NextResponse.json(
      { message: "Não foi possível carregar clientes e serviços." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
