
import React, { useState, useEffect, useMemo } from 'react';
import { CashFlow, TransactionType, PaymentMethod, ServiceOrder } from '../types';

interface CashFlowModalProps {
  isOpen: boolean;
  initialType: TransactionType; // To pre-select Revenue or Expense
  orders: ServiceOrder[]; // To allow linking to an OS
  onClose: () => void;
  onSave: (transaction: Omit<CashFlow, 'id'>) => void;
}

// Helper to format cents to R$
const formatCurrency = (cents: number): string => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper to parse R$ string to cents
const parseCurrency = (value: string): number => {
  const cleanedValue = value.replace(/[^0-9,.]+/g, '').replace('.', '').replace(',', '.');
  return Math.round(parseFloat(cleanedValue || '0') * 100);
};

const CashFlowModal: React.FC<CashFlowModalProps> = ({ isOpen, initialType, orders, onClose, onSave }) => {
  const [tipo, setTipo] = useState<TransactionType>(initialType);
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [valor, setValor] = useState(''); // As string for input
  const [descricao, setDescricao] = useState('');
  const [osId, setOsId] = useState(''); // Optional FK to ServiceOrder
  const [metodo, setMetodo] = useState<PaymentMethod | ''>(''); // Optional PaymentMethod

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTipo(initialType);
      setCategoria('');
      setData(new Date().toISOString().split('T')[0]);
      setValor('');
      setDescricao('');
      setOsId('');
      setMetodo('');
    }
  }, [isOpen, initialType]);

  const categoriesForType = useMemo(() => {
    if (tipo === TransactionType.RECEITA) {
      return ['Entrada OS', 'Venda Direta', 'Outras Receitas'];
    } else {
      return ['Aluguel', 'Salário', 'Material de Limpeza', 'Reparos', 'Marketing', 'Impostos', 'Outras Despesas'];
    }
  }, [tipo]);

  // Handle type change manually to reset category
  const handleTypeChange = (newType: TransactionType) => {
    if (newType !== tipo) {
      setTipo(newType);
      setCategoria(''); // Reset category when type changes to avoid mismatch
    }
  };

  const handleSave = () => {
    const parsedValor = parseCurrency(valor);

    if (!categoria.trim() || !data || isNaN(parsedValor) || parsedValor <= 0 || !descricao.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios: Categoria, Data, Valor (>0) e Descrição.');
      return;
    }

    const newTransaction: Omit<CashFlow, 'id'> = {
      tipo,
      categoria,
      data: new Date(data).toISOString(),
      valor: parsedValor,
      descricao,
      osId: osId || undefined,
      metodo: metodo || undefined,
    };

    onSave(newTransaction);
  };

  // Only return null AFTER all hooks are declared
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={onClose}
         onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
         tabIndex={-1}
         aria-modal="true"
         role="dialog"
         aria-labelledby="cashFlowModalTitle"
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 id="cashFlowModalTitle" className="text-2xl font-black text-gray-800">
                Lançar <span className={tipo === TransactionType.RECEITA ? 'text-success' : 'text-danger'}>{tipo}</span>
              </h3>
              <p className="text-sm text-gray-500">Registre uma nova movimentação no fluxo de caixa.</p>
            </div>
            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar modal de fluxo de caixa">✕</button>
          </div>
        </div>

        <div className="flex-1 p-8 space-y-6">
          {/* Transaction Type Selection */}
          <div className="flex justify-center bg-gray-100 p-1 rounded-full w-max mx-auto mb-6">
            <button
              type="button"
              onClick={() => handleTypeChange(TransactionType.RECEITA)}
              className={`px-8 py-2 rounded-full font-bold text-sm transition-all duration-200 ${
                tipo === TransactionType.RECEITA 
                  ? 'bg-white text-success shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-pressed={tipo === TransactionType.RECEITA}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange(TransactionType.DESPESA)}
              className={`px-8 py-2 rounded-full font-bold text-sm transition-all duration-200 ${
                tipo === TransactionType.DESPESA 
                  ? 'bg-white text-danger shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-pressed={tipo === TransactionType.DESPESA}
            >
              Despesa
            </button>
          </div>

          {/* Form Fields */}
          <div>
            <label htmlFor="cashFlowCategory" className="block text-sm font-semibold text-gray-700 mb-2">Categoria <span className="text-danger">*</span></label>
            <select
              id="cashFlowCategory"
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all bg-white"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-required="true"
            >
              <option value="">Selecione uma categoria</option>
              {categoriesForType.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cashFlowDate" className="block text-sm font-semibold text-gray-700 mb-2">Data <span className="text-danger">*</span></label>
              <input
                type="date"
                id="cashFlowDate"
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
                value={data}
                onChange={(e) => setData(e.target.value)}
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="cashFlowValue" className="block text-sm font-semibold text-gray-700 mb-2">Valor (R$) <span className="text-danger">*</span></label>
              <input
                type="text"
                id="cashFlowValue"
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
                value={valor}
                onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and a single comma/dot for decimal
                    if (/^\d*([.,]\d{0,2})?$/.test(value) || value === '') {
                        setValor(value.replace('.', ',')); // Keep comma for display
                    }
                }}
                placeholder="0,00"
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cashFlowDescription" className="block text-sm font-semibold text-gray-700 mb-2">Descrição <span className="text-danger">*</span></label>
            <textarea
              id="cashFlowDescription"
              rows={3}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all resize-y"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da movimentação..."
              aria-required="true"
            />
          </div>

          {/* Optional: OS Link (primarily for Revenue) */}
          {(tipo === TransactionType.RECEITA) && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <label htmlFor="cashFlowOsId" className="block text-sm font-semibold text-gray-700 mb-2">Vincular a OS (Opcional)</label>
              <select
                id="cashFlowOsId"
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all bg-white"
                value={osId}
                onChange={(e) => setOsId(e.target.value)}
                aria-label="Vincular a uma Ordem de Serviço"
              >
                <option value="">Nenhuma OS</option>
                {orders.map(order => (
                  <option key={order.id} value={order.id}>
                    OS #{order.numeroOs} - Total: {formatCurrency(order.total)} (Pago: {formatCurrency(order.valorPago)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional: Payment Method */}
          <div>
            <label htmlFor="cashFlowMetodo" className="block text-sm font-semibold text-gray-700 mb-2">Método de Pagamento (Opcional)</label>
            <select
              id="cashFlowMetodo"
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all bg-white"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as PaymentMethod | '')}
              aria-label="Método de pagamento da transação"
            >
              <option value="">Não Aplicável</option>
              {Object.values(PaymentMethod).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-all"
            aria-label="Cancelar e fechar"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all ${
              tipo === TransactionType.RECEITA
                ? 'bg-success text-white shadow-success/30 hover:bg-green-700'
                : 'bg-danger text-white shadow-danger/30 hover:bg-red-700'
            }`}
            aria-label={`Salvar ${tipo === TransactionType.RECEITA ? 'receita' : 'despesa'}`}
          >
            Salvar Lançamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashFlowModal;