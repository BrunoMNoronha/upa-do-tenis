"use client";

import React, { useEffect, useState } from "react";
import { getResumoAlertasEstoque } from "@/lib/relatorio-estoque-service";
import Link from "next/link";

interface AlertasEstoque {
  totalInsumosZerados: number;
  totalInsumosAbaixoMinimo: number;
  totalCriticos: number;
}

export function DashboardAlertasEstoque() {
  const [alertas, setAlertas] = useState<AlertasEstoque | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Para simplificar no client component (que não pode chamar a server action async diretamente desta forma se não for passada como prop ou via API)
    // Vamos criar uma Server Action pra isso ou chamar a API?
    // Como a instrução dizia "Adicionar no dashboard um card ou pequeno alerta", vou buscar da API ou Server Action.
    // Vamos usar fetch para a rota que criaremos, mas como o dashboard service já usa server actions, vamos expor via action.
    
    // Aguarde, eu posso apenas buscar da api, ou melhor: posso chamar uma server action? 
    // Vamos buscar da rota da API provisoriamente, ou criar uma action separada. 
    // Na verdade, eu posso bater em `/api/relatorios/estoque` com um param leve? Não, isso seria mais lento.
    // Vou fazer uma chamada fetch a uma rota de API leve ou criar a action.
    // Para resolver agora: fetch('/api/dashboard/alertas-estoque')
    
    // Corrigindo: O DashboardClient já recebe os dados de dashboard-service via action em `page.tsx`.
    // Porém `DashboardClient` é "use client".
    // Vou fazer fetch para a API completa por enquanto, pegando só as estatísticas, ou criar uma rota menor.
    // Criar rota menor: `/api/relatorios/estoque/alertas`.
    
    const fetchAlertas = async () => {
      try {
        const response = await fetch('/api/relatorios/estoque/alertas');
        if (response.ok) {
          const data = await response.json();
          setAlertas(data);
        }
      } catch (error) {
        console.error("Erro ao buscar alertas de estoque:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertas();
  }, []);

  if (loading) {
    return <div className="p-4 bg-gray-50 border rounded-lg animate-pulse h-24"></div>;
  }

  if (!alertas || alertas.totalCriticos === 0) {
    return null; // Não mostra nada se não houver alertas
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start">
        <span className="text-xl mr-3 mt-0.5 flex-shrink-0" aria-hidden="true">⚠️</span>
        <div className="flex-1">
          <h3 className="text-amber-800 font-semibold text-lg mb-1">Atenção: Insumos Críticos</h3>
          <p className="text-amber-700 text-sm mb-3">
            Existem insumos que precisam da sua atenção no estoque.
          </p>
          <div className="flex gap-4">
            {alertas.totalInsumosZerados > 0 && (
              <div className="flex items-center text-red-700 bg-red-100 px-3 py-1.5 rounded-md text-sm font-medium">
                <span className="mr-2">❌</span>
                {alertas.totalInsumosZerados} {alertas.totalInsumosZerados === 1 ? 'insumo zerado' : 'insumos zerados'}
              </div>
            )}
            {alertas.totalInsumosAbaixoMinimo > 0 && (
              <div className="flex items-center text-amber-700 bg-amber-100/50 px-3 py-1.5 rounded-md text-sm font-medium border border-amber-200">
                <span className="mr-2">📉</span>
                {alertas.totalInsumosAbaixoMinimo} {alertas.totalInsumosAbaixoMinimo === 1 ? 'insumo abaixo do mínimo' : 'insumos abaixo do mínimo'}
              </div>
            )}
          </div>
          <div className="mt-4">
            <Link 
              href="/relatorios/estoque" 
              className="text-sm font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2"
            >
              Ver relatório global de estoque
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
