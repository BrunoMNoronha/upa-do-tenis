import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import {
  getEstatisticasGlobaisEstoque,
  getListaInsumosCriticos,
  getExtratoMovimentacoes,
  getResumoPorTipo,
  FiltrosMovimentacao,
} from "@/lib/relatorio-estoque-service";
import { TipoMovimentacao, OrigemMovimentacao } from "@/lib/movimentacao-estoque-service";
import { parseDataLocal } from "@/lib/date-range";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(request);
    if (naoAutenticado) return naoAutenticado;

    const { searchParams } = new URL(request.url);

    const dataInicioStr = searchParams.get("dataInicio");
    const dataFimStr = searchParams.get("dataFim");
    const tipo = searchParams.get("tipo") as TipoMovimentacao | null;
    const origem = searchParams.get("origem") as OrigemMovimentacao | null;
    const insumoId = searchParams.get("insumoId");

    const filtros: FiltrosMovimentacao = {};

    if (dataInicioStr) {
      const dataInicio = parseDataLocal(dataInicioStr);
      if (!isNaN(dataInicio.getTime())) {
        filtros.dataInicio = dataInicio;
      }
    }

    if (dataFimStr) {
      const dataFim = parseDataLocal(dataFimStr);
      if (!isNaN(dataFim.getTime())) {
        filtros.dataFim = dataFim;
      }
    }

    if (tipo && Object.values(TipoMovimentacao).includes(tipo)) {
      filtros.tipo = tipo;
    }

    if (origem && Object.values(OrigemMovimentacao).includes(origem)) {
      filtros.origem = origem;
    }

    if (insumoId) {
      filtros.insumoId = insumoId;
    }

    const [estatisticas, criticos, movimentacoes, resumoTipos] = await Promise.all([
      getEstatisticasGlobaisEstoque(),
      getListaInsumosCriticos(),
      getExtratoMovimentacoes(filtros, 100), // limite de 100 para o relatório
      getResumoPorTipo(filtros),
    ]);

    return NextResponse.json({
      estatisticas,
      criticos,
      movimentacoes,
      resumoTipos,
    });
  } catch (error: any) {
    console.error("Erro ao gerar relatório de estoque:", error);
    return NextResponse.json(
      { error: "Erro ao gerar o relatório. Detalhes: " + error.message },
      { status: 500 }
    );
  }
}
