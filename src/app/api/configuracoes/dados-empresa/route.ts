import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi } from "@/lib/auth-server";
import { salvarDadosEmpresa } from "@/lib/configuracoes";
import { invalidarCacheDadosEmpresa, obterDadosEmpresaComCache } from "@/lib/dados-cache";
import { dadosEmpresaSchema } from "@/lib/dados-empresa";

const SEM_CACHE_HTTP = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) {
      naoAutenticado.headers.set("Cache-Control", "private, no-store");
      return naoAutenticado;
    }
    return NextResponse.json(await obterDadosEmpresaComCache(), { status: 200, headers: SEM_CACHE_HTTP });
  } catch (error) {
    console.error("Erro ao carregar os dados da empresa:", error);
    return NextResponse.json({ message: "Erro interno ao carregar os dados da empresa." }, { status: 500, headers: SEM_CACHE_HTTP });
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
    invalidarCacheDadosEmpresa();
    return NextResponse.json(dados, { status: 200 });
  } catch (error) {
    console.error("Erro ao salvar os dados da empresa:", error);
    return NextResponse.json({ message: "Erro interno ao salvar os dados da empresa." }, { status: 500 });
  }
}
