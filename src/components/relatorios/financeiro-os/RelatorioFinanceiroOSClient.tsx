'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RelatorioFinanceiroOSResponse } from '@/lib/relatorio-financeiro-os-service';
import { RelatorioFinanceiroOSFiltros } from './RelatorioFinanceiroOSFiltros';
import { RelatorioFinanceiroOSTabela } from './RelatorioFinanceiroOSTabela';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LoadingState, ErrorState } from '@/components/ui';

export function RelatorioFinanceiroOSClient() {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [statusFinanceiro, setStatusFinanceiro] = useState('TODOS');
  const [statusOperacional, setStatusOperacional] = useState('TODOS');
  const [cliente, setCliente] = useState('');
  const [saldoAberto, setSaldoAberto] = useState(false);
  
  const [relatorio, setRelatorio] = useState<RelatorioFinanceiroOSResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const formataData = (d: Date) => d.toISOString().split('T')[0];
    
    setInicio(formataData(primeiroDia));
    setFim(formataData(hoje));
  }, []);

  const fetchRelatorio = useCallback(async () => {
    if (!inicio || !fim) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (inicio) params.append('inicio', inicio);
      if (fim) params.append('fim', fim);
      if (statusFinanceiro && statusFinanceiro !== 'TODOS') params.append('statusFinanceiro', statusFinanceiro);
      if (statusOperacional && statusOperacional !== 'TODOS') params.append('statusOperacional', statusOperacional);
      if (cliente) params.append('cliente', cliente);
      if (saldoAberto) params.append('saldoAberto', 'true');

      const res = await fetch(`/api/relatorios/financeiro-os?${params.toString()}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao buscar dados do relatório.');
      }
      
      const data: RelatorioFinanceiroOSResponse = await res.json();
      setRelatorio(data);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, [inicio, fim, statusFinanceiro, statusOperacional, cliente, saldoAberto]);

  useEffect(() => {
    if (inicio && fim) {
      fetchRelatorio();
    }
  }, [inicio, fim, fetchRelatorio]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key: string, value: any) => {
    switch (key) {
      case 'inicio': setInicio(value); break;
      case 'fim': setFim(value); break;
      case 'statusFinanceiro': setStatusFinanceiro(value); break;
      case 'statusOperacional': setStatusOperacional(value); break;
      case 'cliente': setCliente(value); break;
      case 'saldoAberto': setSaldoAberto(value); break;
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  return (
    <div className="space-y-6">
      <RelatorioFinanceiroOSFiltros
        inicio={inicio}
        fim={fim}
        statusFinanceiro={statusFinanceiro}
        statusOperacional={statusOperacional}
        cliente={cliente}
        saldoAberto={saldoAberto}
        onFilterChange={handleFilterChange}
        onFiltrar={fetchRelatorio}
        loading={loading}
      />

      {error && (
        <ErrorState description={error} />
      )}

      {loading && !relatorio && (
        <LoadingState text="Processando relatório financeiro..." />
      )}

      {relatorio && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Qtd. de OS Filtradas"
              value={relatorio.resumo.quantidadeOS}
              description="No período selecionado"
            />
            <MetricCard
              title="Valor Total"
              value={formatarMoeda(relatorio.resumo.valorTotal)}
            />
            <MetricCard
              title="Valor Pago"
              value={formatarMoeda(relatorio.resumo.valorPago)}
            />
            <MetricCard
              title="Saldo em Aberto"
              value={formatarMoeda(relatorio.resumo.saldoAberto)}
              description={`${relatorio.resumo.quantidadeComSaldoAberto} OS pendente(s)`}
            />
          </div>

          <RelatorioFinanceiroOSTabela itens={relatorio.itens} />
        </div>
      )}
    </div>
  );
}
