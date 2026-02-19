
import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { ServiceOrder, CashFlow, TransactionType, PaymentMethod, OSItem } from '../types';

interface ReportsProps {
  orders: ServiceOrder[];
  cashFlow: CashFlow[];
}

// Adjusted COLORS for the new Emerald Green theme
const COLORS_FINANCE = ['#059669', '#DC2626', '#047857']; // Success (Emerald 600), Danger, Primary Dark (Emerald 700)
const COLORS_PAYMENT = ['#34d399', '#10b981', '#059669', '#064e3b']; // Emerald 400, 500, 600, 900
const COLORS_ITEMS = [
  '#064e3b', // Emerald 900
  '#065f46', // Emerald 800
  '#047857', // Emerald 700
  '#059669', // Emerald 600
  '#10b981', // Emerald 500
  '#34d399', // Emerald 400
  '#6ee7b7', // Emerald 300
  '#a7f3d0', // Emerald 200
  '#d1fae5', // Emerald 100
  '#ecfdf5'  // Emerald 50
];

const Reports: React.FC<ReportsProps> = ({ orders, cashFlow }) => {

  // 1. Monthly Financial Data
  const monthlyData = useMemo(() => {
    const dataMap = new Map<string, { revenue: number; expenses: number }>(); // Key: YYYY-MM

    cashFlow.forEach(transaction => {
      const date = new Date(transaction.data);
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!dataMap.has(yearMonth)) {
        dataMap.set(yearMonth, { revenue: 0, expenses: 0 });
      }

      const current = dataMap.get(yearMonth)!;
      if (transaction.tipo === TransactionType.RECEITA) {
        current.revenue += transaction.valor;
      } else {
        current.expenses += transaction.valor;
      }
    });

    const sortedMonths = Array.from(dataMap.keys()).sort();
    return sortedMonths.map(month => {
      const { revenue, expenses } = dataMap.get(month)!;
      return {
        month,
        Receita: revenue / 100,
        Despesa: expenses / 100,
        Lucro: (revenue - expenses) / 100,
      };
    });
  }, [cashFlow]);

  // 2. Revenue by Payment Method
  const revenueByPaymentMethod = useMemo(() => {
    const paymentMap = new Map<PaymentMethod, number>();

    cashFlow.forEach(transaction => {
      if (transaction.tipo === TransactionType.RECEITA && transaction.metodo) {
        paymentMap.set(transaction.metodo, (paymentMap.get(transaction.metodo) || 0) + transaction.valor);
      }
    });

    return Array.from(paymentMap.entries()).map(([method, value]) => ({
      name: method,
      value: value / 100,
    })).filter(item => item.value > 0); // Only show methods with actual revenue
  }, [cashFlow]);

  // 3. Top Services/Products
  const topItems = useMemo(() => {
    const itemSalesMap = new Map<string, { name: string; type: 'Serviço' | 'Produto'; totalRevenue: number }>();

    orders.forEach(order => {
      order.itens.forEach(item => {
        const key = `${item.tipo}-${item.itemId}`;
        if (!itemSalesMap.has(key)) {
          itemSalesMap.set(key, {
            name: item.nome,
            type: item.tipo === 'SERVICO' ? 'Serviço' : 'Produto',
            totalRevenue: 0
          });
        }
        itemSalesMap.get(key)!.totalRevenue += item.valorUnitario * item.quantidade;
      });
    });

    return Array.from(itemSalesMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10) // Top 10 items
      .map(item => ({
        ...item,
        totalRevenue: item.totalRevenue / 100
      }));
  }, [orders]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios de Faturamento</h1>
      <p className="text-sm text-gray-500">Análise consolidada do desempenho financeiro e operacional da sua sapataria.</p>

      {/* Monthly Financial Overview */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="mr-3 text-2xl">📈</span> Desempenho Financeiro Mensal
        </h3>
        <div className="h-80">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" aria-label="Gráfico de linha de desempenho financeiro mensal">
              <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tickFormatter={(tick) => {
                  const [year, month] = tick.split('-');
                  return new Date(year, parseInt(month) - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
                }} tick={{ fill: '#6b7280' }} />
                <YAxis tickFormatter={(tick) => `R$ ${tick.toFixed(2)}`} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, name]}
                  labelFormatter={(label) => {
                    const [year, month] = label.split('-');
                    return new Date(year, parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                  }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderColor: '#e5e7eb', 
                    color: '#111827' 
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="Receita" stroke={COLORS_FINANCE[0]} strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Despesa" stroke={COLORS_FINANCE[1]} strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Lucro" stroke={COLORS_FINANCE[2]} strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 italic text-center py-20">Nenhum dado financeiro mensal disponível para exibir.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue by Payment Method */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="mr-3 text-2xl">💳</span> Receita por Forma de Pagamento
          </h3>
          <div className="h-80 flex items-center justify-center">
            {revenueByPaymentMethod.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" aria-label="Gráfico de pizza de receita por forma de pagamento">
                <PieChart>
                  <Pie
                    data={revenueByPaymentMethod}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    stroke="none"
                  >
                    {revenueByPaymentMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PAYMENT[index % COLORS_PAYMENT.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderColor: '#e5e7eb', 
                      color: '#111827' 
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#4b5563' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic text-center py-20">Nenhuma receita registrada ainda.</p>
            )}
          </div>
        </div>

        {/* Top Services/Products */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="mr-3 text-2xl">🌟</span> Top 10 Serviços/Produtos
          </h3>
          <div className="h-80">
            {topItems.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" aria-label="Gráfico de barras dos top 10 serviços e produtos">
                <BarChart
                  data={topItems}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 50, bottom: 5 }} // Increased left margin for YAxis labels
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={(tick) => `R$ ${tick.toFixed(2)}`} tick={{ fill: '#6b7280' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={150} // Adjust width to prevent labels from overlapping
                    tickFormatter={(tick) => {
                      const item = topItems.find(i => i.name === tick);
                      // Display first letter of type in parentheses (S) for Service, (P) for Product
                      return `${tick} (${item?.type.charAt(0)})`;
                    }}
                    fontSize={12}
                    aria-label="Nome do Serviço ou Produto"
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, "Receita Total"]} 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderColor: '#e5e7eb', 
                      color: '#111827' 
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalRevenue" fill={COLORS_ITEMS[3]} radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic text-center py-20">Nenhum serviço ou produto vendido ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;