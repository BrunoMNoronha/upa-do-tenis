'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RelatorioFinanceiroOSResponse } from '@/lib/relatorio-financeiro-os-service';
import { RelatorioFinanceiroOSFiltros } from './RelatorioFinanceiroOSFiltros';
import { RelatorioFinanceiroOSTabela } from './RelatorioFinanceiroOSTabela';
import { RelatorioFinanceiroOSGraficos } from './RelatorioFinanceiroOSGraficos';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LoadingState, ErrorState } from '@/components/ui';
import { formatarDataLocal } from '@/lib/date-range';
import { formatCurrency } from '@/lib/formatters';

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
  // Contador de requisições: garante que uma resposta antiga (filtro anterior)
  // nunca sobrescreva o resultado de uma requisição mais recente.
  const requisicaoAtual = useRef(0);

  useEffect(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    setInicio(formatarDataLocal(primeiroDia));
    setFim(formatarDataLocal(hoje));
  }, []);

  const fetchRelatorio = useCallback(async () => {
    if (!inicio || !fim) return;

    const idRequisicao = ++requisicaoAtual.current;
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
      if (idRequisicao !== requisicaoAtual.current) return;
      setRelatorio(data);
    } catch (err: any) {
      if (idRequisicao !== requisicaoAtual.current) return;
      setError(err.message || 'Erro desconhecido.');
    } finally {
      if (idRequisicao === requisicaoAtual.current) {
        setLoading(false);
      }
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
        <div className="space-y-6 animate-in fade-in duration-500" aria-busy={loading}>
          {relatorio.agregacaoTruncada && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
              O conjunto filtrado ultrapassou o limite de agregação. Resumo e gráficos consideram apenas as OS mais recentes dentro desse limite; restrinja o período para obter números completos.
            </div>
          )}

          <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <MetricCard
              title="Qtd. de OS Filtradas"
              value={relatorio.resumo.quantidadeOS}
              description="No período selecionado"
            />
            <MetricCard
              title="Valor Total"
              value={formatCurrency(relatorio.resumo.valorTotal)}
            />
            <MetricCard
              title="Valor Pago"
              value={formatCurrency(relatorio.resumo.valorPago)}
            />
            <MetricCard
              title="Saldo em Aberto"
              value={formatCurrency(relatorio.resumo.saldoAberto)}
              description={`${relatorio.resumo.quantidadeComSaldoAberto} OS pendente(s)`}
            />
          </div>

          <RelatorioFinanceiroOSGraficos
            agregados={relatorio.agregados}
            quantidadeOS={relatorio.resumo.quantidadeOS}
            atualizando={loading}
          />

          {relatorio.tabela?.limitada && (
            <p className="text-xs text-slate-500" role="status">
              A tabela exibe as {relatorio.tabela.limite} OS mais recentes de {relatorio.tabela.totalItens} encontradas. Os cards e os gráficos consideram todas as {relatorio.tabela.totalItens} OS filtradas.
            </p>
          )}

          <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <RelatorioFinanceiroOSTabela itens={relatorio.itens} />
          </div>
        </div>
      )}
    </div>
  );
}
