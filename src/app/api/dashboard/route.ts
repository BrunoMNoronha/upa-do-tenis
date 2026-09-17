import { NextRequest, NextResponse } from 'next/server';
import { exigirSessaoApi } from '@/lib/auth-server';
import { getDashboardMetrics } from '@/lib/dashboard-service';
import { dataOperacionalHoje, intervaloDoDiaOperacional } from '@/lib/date-range';

export const dynamic = 'force-dynamic';

function diaValido(valor: string | null): valor is string {
  return valor !== null && !isNaN(intervaloDoDiaOperacional(valor).inicio.getTime());
}

export async function GET(request: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(request);
    if (naoAutenticado) return naoAutenticado;

    const searchParams = request.nextUrl.searchParams;
    const inicioStr = searchParams.get('inicio');
    const fimStr = searchParams.get('fim');

    // Padrão: mês atual no fuso da operação (o processo pode rodar em UTC),
    // do dia 1 até hoje.
    const hoje = dataOperacionalHoje();
    const dataInicio = diaValido(inicioStr) ? inicioStr : `${hoje.slice(0, 7)}-01`;
    const dataFim = diaValido(fimStr) ? fimStr : hoje;

    const metrics = await getDashboardMetrics(dataInicio, dataFim);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas do dashboard:', error);
    return NextResponse.json({ error: 'Falha ao buscar métricas.' }, { status: 500 });
  }
}
