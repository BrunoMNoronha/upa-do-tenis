import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/dashboard-service';
import { parseDataLocal } from '@/lib/date-range';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inicioStr = searchParams.get('inicio');
    const fimStr = searchParams.get('fim');

    // Default: current month if not provided
    let dataInicio = new Date();
    dataInicio.setDate(1); // First day of the month
    dataInicio.setHours(0, 0, 0, 0);

    let dataFim = new Date();
    dataFim.setHours(23, 59, 59, 999); // Today

    if (inicioStr) {
      const parsedInicio = parseDataLocal(inicioStr);
      if (!isNaN(parsedInicio.getTime())) {
        dataInicio = parsedInicio;
      }
    }

    if (fimStr) {
      const parsedFim = parseDataLocal(fimStr);
      if (!isNaN(parsedFim.getTime())) {
        dataFim = parsedFim;
      }
    }

    const metrics = await getDashboardMetrics(dataInicio, dataFim);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas do dashboard:', error);
    return NextResponse.json({ error: 'Falha ao buscar métricas.' }, { status: 500 });
  }
}
