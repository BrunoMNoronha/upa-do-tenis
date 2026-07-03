import { NextRequest, NextResponse } from 'next/server';
import { gerarRelatorioFinanceiroOS, RelatorioFiltros } from '@/lib/relatorio-financeiro-os-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inicioStr = searchParams.get('inicio');
    const fimStr = searchParams.get('fim');

    // Default: current month if not provided
    let inicio = '';
    let fim = '';

    if (!inicioStr || !fimStr) {
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const formataData = (d: Date) => d.toISOString().split('T')[0];
      
      inicio = formataData(primeiroDia);
      fim = formataData(hoje);
    } else {
      inicio = inicioStr;
      fim = fimStr;
    }

    const filtros: RelatorioFiltros = {
      inicio,
      fim,
      statusFinanceiro: searchParams.get('statusFinanceiro') || undefined,
      statusOperacional: searchParams.get('statusOperacional') || undefined,
      cliente: searchParams.get('cliente') || undefined,
    };

    const saldoAbertoStr = searchParams.get('saldoAberto');
    if (saldoAbertoStr === 'true') filtros.saldoAberto = true;
    if (saldoAbertoStr === 'false') filtros.saldoAberto = false;

    const relatorio = await gerarRelatorioFinanceiroOS(filtros);
    return NextResponse.json(relatorio);
  } catch (error: any) {
    console.error('Erro ao buscar relatorio financeiro os:', error);
    if (error.message === 'Datas inválidas.' || error.message === 'A data inicial não pode ser maior que a data final.') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Falha ao buscar relatório.' }, { status: 500 });
  }
}
