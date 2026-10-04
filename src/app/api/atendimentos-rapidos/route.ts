import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi, obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { CaixaError } from "@/lib/caixa";
import { registrarAtendimentoRapidoSchema } from "@/lib/atendimento-rapido-schema";
import {
  AtendimentoRapidoError,
  listarAtendimentosRapidosPaginado,
  registrarAtendimentoRapido,
} from "@/lib/atendimento-rapido";
import { lerBuscaDeSearchParams } from "@/lib/busca-listagem";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";

function resolverErro(error: unknown, mensagemPadrao: string, contexto: string) {
  if (error instanceof AtendimentoRapidoError || error instanceof CaixaError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  console.error(contexto, error);
  return NextResponse.json({ message: mensagemPadrao }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const { searchParams } = new URL(req.url);

    const resultado = await listarAtendimentosRapidosPaginado({
      filtros: {
        busca: lerBuscaDeSearchParams(searchParams),
        dataInicial: searchParams.get("dataInicial") || undefined,
        dataFinal: searchParams.get("dataFinal") || undefined,
      },
      paginacao: lerPaginacaoDeSearchParams(searchParams),
    });

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    return resolverErro(
      error,
      "Ocorreu um erro interno ao listar os atendimentos rápidos.",
      "Erro ao listar atendimentos rápidos:",
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
    }

    const result = registrarAtendimentoRapidoSchema.safeParse(body);
    if (!result.success) {
      const primeiraMensagem = result.error.issues[0]?.message;
      return NextResponse.json(
        { message: primeiraMensagem ?? "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 },
      );
    }

    const usuario = await obterUsuarioSessaoDaRequest(req);
    const { atendimento, reaproveitado } = await registrarAtendimentoRapido(result.data, {
      usuarioId: usuario?.id ?? null,
    });

    // 201 na criação; 200 quando a mesma chave devolve o atendimento já registrado.
    return NextResponse.json({ atendimento, reaproveitado }, { status: reaproveitado ? 200 : 201 });
  } catch (error) {
    return resolverErro(
      error,
      "Ocorreu um erro interno ao registrar o atendimento rápido.",
      "Erro ao registrar atendimento rápido:",
    );
  }
}
