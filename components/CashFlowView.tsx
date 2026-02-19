
import React, { useState, useMemo } from 'react';
import { CashFlow, TransactionType } from '../types';

interface CashFlowViewProps {
  cashFlow: CashFlow[];
  onOpenAddRevenueModal: () => void;
  onOpenAddExpenseModal: () => void;
}

const formatCurrency = (cents: number): string => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CashFlowView: React.FC<CashFlowViewProps> = ({ cashFlow, onOpenAddRevenueModal, onOpenAddExpenseModal }) => {
  const [showOnlyToday, setShowOnlyToday] = useState(true); // Default to true as requested

  const filteredCashFlow = useMemo(() => {
    if (!showOnlyToday) {
      return cashFlow;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

    return cashFlow.filter(t => {
      const transactionDate = new Date(t.data);
      transactionDate.setHours(0, 0, 0, 0); // Normalize transaction date to start of day
      return transactionDate.getTime() === today.getTime();
    });
  }, [cashFlow, showOnlyToday]);
  
  const totalRevenue = useMemo(() => filteredCashFlow
    .filter(t => t.tipo === TransactionType.RECEITA)
    .reduce((acc, curr) => acc + curr.valor, 0), [filteredCashFlow]);

  const totalExpenses = useMemo(() => filteredCashFlow
    .filter(t => t.tipo === TransactionType.DESPESA)
    .reduce((acc, curr) => acc + curr.valor, 0), [filteredCashFlow]);

  const currentBalance = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fluxo de Caixa</h1>
          <p className="text-sm text-gray-500">Gerencie todas as entradas e saídas financeiras.</p>
        </div>
        <div className="flex space-x-3">
           <button 
             type="button"
             onClick={onOpenAddExpenseModal}
             className="bg-danger/10 text-danger px-4 py-2 rounded-xl font-bold text-sm hover:bg-danger/20 active:scale-95 transition-all shadow-sm hover:shadow-md flex items-center"
             aria-label="Lançar nova despesa"
           >
             <span className="mr-2 text-lg">▼</span> Lançar Despesa
           </button>
           <button 
             type="button"
             onClick={onOpenAddRevenueModal}
             className="bg-success/10 text-success px-4 py-2 rounded-xl font-bold text-sm hover:bg-success/20 active:scale-95 transition-all shadow-sm hover:shadow-md flex items-center"
             aria-label="Lançar nova receita"
           >
             <span className="mr-2 text-lg">▲</span> Lançar Receita
           </button>
        </div>
      </div>

      {/* Financial Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center p-4 bg-success/5 rounded-xl border border-success/10 transition-transform hover:scale-[1.02]">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Receita Total {showOnlyToday && '(Hoje)'}</p>
          <p className="text-2xl font-black text-success">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="text-center p-4 bg-danger/5 rounded-xl border border-danger/10 transition-transform hover:scale-[1.02]">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Despesa Total {showOnlyToday && '(Hoje)'}</p>
          <p className="text-2xl font-black text-danger">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className={`text-center p-4 rounded-xl border transition-transform hover:scale-[1.02] ${currentBalance >= 0 ? 'bg-primary-light/5 border-primary-light/10' : 'bg-danger/5 border-danger/10'}`}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Saldo Atual {showOnlyToday && '(Hoje)'}</p>
          <p className={`text-2xl font-black ${currentBalance >= 0 ? 'text-primary' : 'text-danger'}`}>{formatCurrency(currentBalance)}</p>
        </div>
      </div>

      {/* Filter for Today/All Records */}
      <div className="flex justify-start">
        <div className="inline-flex bg-gray-100 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setShowOnlyToday(true)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              showOnlyToday ? 'bg-primary-light text-white shadow' : 'text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={showOnlyToday}
          >
            Somente Hoje
          </button>
          <button
            onClick={() => setShowOnlyToday(false)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              !showOnlyToday ? 'bg-primary-light text-white shadow' : 'text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={!showOnlyToday}
          >
            Todos os Registros
          </button>
        </div>
      </div>


      {/* Cash Flow Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
         <table className="w-full text-left">
           <thead className="bg-gray-50 border-b border-gray-100">
             <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
               <th className="px-6 py-4">Data</th>
               <th className="px-6 py-4">Tipo</th>
               <th className="px-6 py-4">Categoria</th>
               <th className="px-6 py-4">Descrição</th>
               <th className="px-6 py-4 text-right">Valor</th>
             </tr>
           </thead>
           <tbody className="text-sm">
             {filteredCashFlow.length === 0 ? (
               <tr><td colSpan={5} className="text-center py-20 text-gray-400 italic">Nenhuma movimentação registrada {showOnlyToday ? 'para hoje' : ''}.</td></tr>
             ) : filteredCashFlow.slice().reverse().map(t => (
               <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-100 transition-colors group">
                 <td className="px-6 py-4 text-gray-500 font-medium">{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                 <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                     t.tipo === TransactionType.RECEITA 
                       ? 'bg-success/10 text-success' 
                       : 'bg-danger/10 text-danger'
                   }`}>
                     {t.tipo}
                   </span>
                 </td>
                 <td className="px-6 py-4 text-gray-700 font-medium">{t.categoria}</td>
                 <td className="px-6 py-4 text-gray-500 group-hover:text-gray-700 transition-colors">{t.descricao}</td>
                 <td className={`px-6 py-4 text-right font-black ${t.tipo === TransactionType.RECEITA ? 'text-success' : 'text-danger'}`}>
                   {t.tipo === TransactionType.RECEITA ? '+' : '-'} {formatCurrency(t.valor)}
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>
    </div>
  );
};

export default CashFlowView;
