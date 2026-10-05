import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { servicoFormSchema } from "@/lib/servicos-schema";
import { invalidarCacheServicos, listarServicosComCache } from "@/lib/dados-cache";
import { prisma } from "@/lib/prisma";

const SEM_CACHE_HTTP = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) {
      naoAutenticado.headers.set("Cache-Control", "private, no-store");
      return naoAutenticado;
    }

    const servicos = await listarServicosComCache();
    return NextResponse.json(servicos, { status: 200, headers: SEM_CACHE_HTTP });
  } catch (error) {
    console.error("Erro ao listar serviços:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao listar os serviços." },
      { status: 500, headers: SEM_CACHE_HTTP }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json();
    const result = servicoFormSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    const novoServico = await prisma.servico.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        precoBase: data.precoBase,
        ativo: true,
      },
    });

    invalidarCacheServicos();
    return NextResponse.json(novoServico, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar o serviço." },
      { status: 500 }
    );
  }
}
