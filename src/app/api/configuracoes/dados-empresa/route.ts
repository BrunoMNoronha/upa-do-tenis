import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi } from "@/lib/auth-server";
import { obterDadosEmpresa, salvarDadosEmpresa } from "@/lib/configuracoes";
import { dadosEmpresaSchema } from "@/lib/dados-empresa";

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    return NextResponse.json(await obterDadosEmpresa(), { status: 200 });
  } catch (error) {
    console.error("Erro ao carregar os dados da empresa:", error);
    return NextResponse.json({ message: "Erro interno ao carregar os dados da empresa." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json().catch(() => null);
    const resultado = dadosEmpresaSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { message: "Revise os campos informados.", errors: resultado.error.flatten() },
        { status: 400 },
      );
    }

    const dados = await salvarDadosEmpresa(resultado.data);
    return NextResponse.json(dados, { status: 200 });
  } catch (error) {
    console.error("Erro ao salvar os dados da empresa:", error);
    return NextResponse.json({ message: "Erro interno ao salvar os dados da empresa." }, { status: 500 });
  }
}
