
import React, { useState, useEffect, useMemo } from 'react';
import { ServiceOrder, CashFlow, OSStatus, TransactionType, Product, Client } from '../types';
import { getBusinessInsights } from '../services/gemini';

interface DashboardProps {
  orders: ServiceOrder[];
  cashFlow: CashFlow[];
  clients: Client[];
  products: Product[];
  showGeminiInsights: boolean; // New prop
  setShowGeminiInsights: (value: boolean) => void; // New prop
}

const formatCurrency = (cents: number): string => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const Dashboard: React.FC<DashboardProps> = ({ orders, cashFlow, clients, products, showGeminiInsights, setShowGeminiInsights }) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!showGeminiInsights) {
        setInsights([]); // Clear insights if disabled
        return;
      }
      setLoadingInsights(true);
      const res = await getBusinessInsights(orders, cashFlow);
      setInsights(res);
      setLoadingInsights(false);
    };
    // Fetch insights whenever orders, cashFlow, or showGeminiInsights change
    fetchInsights();
  }, [orders, cashFlow, showGeminiInsights]); 

  // --- Calculations for new informational cards ---

  // 1. Cliente com mais compras
  const topClient = useMemo(() => {
    const clientSpendingMap = new Map<string, number>(); // clientId -> total spent

    orders.forEach(order => {
      const clientTotal = order.pagamentos.reduce((acc, p) => acc + p.valor, 0); // Consider actual payments
      clientSpendingMap.set(order.clienteId, (clientSpendingMap.get(order.clienteId) || 0) + clientTotal);
    });

    let topClientId: string | undefined;
    let maxSpending = 0;

    clientSpendingMap.forEach((spending, clientId) => {
      if (spending > maxSpending) {
        maxSpending = spending;
        topClientId = clientId;
      }
    });

    if (topClientId) {
      const client = clients.find(c => c.id === topClientId);
      return client ? { name: client.nome, totalSpent: maxSpending } : null;
    }
    return null;
  }, [orders, clients]);

  // 2. Top Produtos/Serviços Vendidos (by revenue)
  const topSellingItems = useMemo(() => {
    const itemRevenueMap = new Map<string, { name: string; type: 'Produto' | 'Serviço'; revenue: number }>();

    orders.forEach(order => {
      order.itens.forEach(item => {
        const key = `${item.tipo}-${item.itemId}`;
        const currentRevenue = item.valorUnitario * item.quantidade;

        if (itemRevenueMap.has(key)) {
          itemRevenueMap.get(key)!.revenue += currentRevenue;
        } else {
          itemRevenueMap.set(key, {
            name: item.nome,
            type: item.tipo === 'PRODUTO' ? 'Produto' : 'Serviço',
            revenue: currentRevenue,
          });
        }
      });
    });

    return Array.from(itemRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3); // Top 3 items
  }, [orders]);

  // 3. Alerta de Estoque Baixo (threshold: 5 units)
  const lowStockProducts = useMemo(() => {
    const LOW_STOCK_THRESHOLD = 5;
    return products.filter(p => p.estoque <= LOW_STOCK_THRESHOLD && p.estoque > 0);
  }, [products]);

  // 4. Alerta de OS Atrasadas
  const overdueOrders = useMemo(() => {
    const now = new Date();
    // Filter orders that are not delivered and whose due date is in the past
    return orders.filter(order => 
      order.status !== OSStatus.ENTREGUE &&
      new Date(order.dataPrevista) < now
    ).slice(0, 3); // Show up to 3 overdue orders
  }, [orders]);


  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Gemini Insights */}
      <div className="bg-primary-dark text-white p-6 rounded-2xl shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center">
            <span className="mr-2">✨</span> Insights Inteligentes (Gemini)
          </h3>
          <label htmlFor="gemini-toggle" className="flex items-center cursor-pointer">
            <span className="relative">
              <input
                type="checkbox"
                id="gemini-toggle"
                className="sr-only"
                checked={showGeminiInsights}
                onChange={(e) => setShowGeminiInsights(e.target.checked)}
              />
              <div className="block bg-gray-600 w-12 h-6 rounded-full"></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                showGeminiInsights ? 'translate-x-full bg-primary-light' : ''
              }`}></div>
            </span>
            <span className="ml-3 text-sm font-medium text-gray-300">
              {showGeminiInsights ? 'Ativo' : 'Inativo'}
            </span>
          </label>
        </div>
        
        <div className="flex-1 space-y-4">
          {showGeminiInsights ? (
            loadingInsights ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 py-8">
                <div className="w-10 h-10 border-4 border-primary-light border-t-transparent rounded-full animate-spin"></div>
                <p className="text-primary-light/80 text-sm italic">O Gemini está analisando seus dados e gerando insights valiosos...</p>
              </div>
            ) : (
              insights.map((insight, idx) => (
                <div key={idx} className="bg-primary/50 p-4 rounded-xl border border-primary-dark">
                  <p className="text-sm text-primary-light/90 leading-relaxed">{insight}</p>
                </div>
              ))
            )
          ) : (
            <div className="bg-primary/50 p-4 rounded-xl border border-primary-dark text-center py-8">
              <p className="text-sm text-primary-light/80 italic">Insights inteligentes do Gemini estão desativados.</p>
              <p className="text-xs text-primary-light/60 mt-2">Ative o botão acima para ver recomendações estratégicas.</p>
            </div>
          )}
        </div>
        <p className="mt-4 text-[10px] text-primary-light/70 uppercase tracking-widest text-center">IA orientada a resultados</p>
      </div>

      {/* New Informational Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Card: Cliente com Mais Compras */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-800 flex items-center mb-3">
            <span className="mr-2 text-xl">👑</span> Cliente Top
          </h3>
          {topClient ? (
            <div>
              <p className="text-xl font-black text-primary-dark leading-tight">{topClient.name}</p>
              <p className="text-sm text-gray-500 mt-1">Total gasto: <span className="font-bold text-primary">{formatCurrency(topClient.totalSpent)}</span></p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Nenhum cliente com compras registradas.</p>
          )}
        </div>

        {/* Card: Top Produtos/Serviços Vendidos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-800 flex items-center mb-3">
            <span className="mr-2 text-xl">📈</span> Mais Vendidos
          </h3>
          {topSellingItems.length > 0 ? (
            <ul className="space-y-2">
              {topSellingItems.map((item, idx) => (
                <li key={idx} className="text-sm flex justify-between">
                  <span className="text-gray-700">{item.name} <span className="text-gray-400 text-xs">({item.type.charAt(0)})</span></span>
                  <span className="font-semibold text-primary-light">{formatCurrency(item.revenue)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">Nenhum item vendido ainda.</p>
          )}
        </div>

        {/* Card: Alerta de Estoque Baixo */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-800 flex items-center mb-3">
            <span className="mr-2 text-xl">⚠️</span> Estoque Baixo
          </h3>
          {lowStockProducts.length > 0 ? (
            <ul className="space-y-2">
              {lowStockProducts.map((product, idx) => (
                <li key={idx} className="text-sm flex justify-between">
                  <span className="text-danger font-medium">{product.nome}</span>
                  <span className="font-semibold text-danger">{product.estoque} un</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">Estoque OK! Nenhum item crítico.</p>
          )}
        </div>

        {/* Card: Alerta de OS Atrasadas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-800 flex items-center mb-3">
            <span className="mr-2 text-xl">⏰</span> OS Atrasadas
          </h3>
          {overdueOrders.length > 0 ? (
            <ul className="space-y-2">
              {overdueOrders.map((order, idx) => (
                <li key={idx} className="text-sm flex justify-between items-center">
                  <span className="text-danger font-medium">{`OS #${order.numeroOs}`}</span>
                  <span className="text-xs text-danger-light">
                    {new Date(order.dataPrevista).toLocaleDateString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">Nenhuma OS atrasada! Bom trabalho!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
