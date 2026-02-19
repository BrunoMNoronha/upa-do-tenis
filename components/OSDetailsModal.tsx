
import React, { useState, useCallback } from 'react';
import { ServiceOrder, Client, OSStatus, PaymentMethod } from '../types';
import { formatCurrency, parseCurrency, getWhatsAppLink } from '../utils';

interface OSDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
  clients: Client[];
  updateStatus: (id: string, status: OSStatus, obs?: string) => void;
  addPayment: (id: string, valor: number, metodo: PaymentMethod, obs?: string) => void;
}

const OSDetailsModal: React.FC<OSDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  clients,
  updateStatus,
  addPayment,
}) => {
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [paymentObsInput, setPaymentObsInput] = useState('');

  if (!isOpen || !order) return null;

  const client = clients.find(c => c.id === order.clienteId);

  const handleInlinePaymentSubmit = useCallback(() => {
    const amount = parseCurrency(paymentAmountInput);
    if (amount <= 0) {
      alert("Por favor, insira um valor de pagamento válido.");
      return;
    }
    addPayment(order.id, amount, paymentMethodInput, paymentObsInput);
    onClose(); // Close modal after payment
    // Reset payment form fields
    setPaymentAmountInput('');
    setPaymentMethodInput(PaymentMethod.PIX);
    setPaymentObsInput('');
  }, [order, paymentAmountInput, paymentMethodInput, paymentObsInput, addPayment, onClose]);


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      aria-labelledby="osDetailsTitle"
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 id="osDetailsTitle" className="text-2xl font-black text-gray-800">OS #{order.numeroOs}</h3>
              <p className="text-sm text-gray-500">Detalhes completos do serviço</p>
            </div>
            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar detalhes da ordem de serviço">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Itens do Pedido</h4>
              <ul className="space-y-2">
                {order.itens.map(item => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.nome} x{item.quantidade}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(item.valorUnitario * item.quantidade)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-2 border-t flex justify-between font-bold text-lg">
                <span className="text-gray-800">Total</span>
                <span className="text-success">{formatCurrency(order.total)}</span>
              </div>
            </div>

            <div className="bg-primary-light/5 p-6 rounded-2xl border border-primary-light/20">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Atualizar Status</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.values(OSStatus).map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const clientName = client?.nome || 'cliente';
                      let whatsappMessage = `Olá ${clientName}, `;
                      whatsappMessage += `a Ordem de Serviço #${order.numeroOs} teve seu status atualizado para: *${s}*.`;
                      whatsappMessage += `\n\nUPA do Tênis agradece!`;

                      const link = getWhatsAppLink(client?.contato || '', whatsappMessage);

                      updateStatus(order.id, s, `Status atualizado para ${s}`);

                      if (client?.contato) {
                        window.open(link, '_blank');
                      }

                      onClose(); // Close after update for simplicity
                    }}
                    className={`text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${order.status === s
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white text-primary hover:bg-primary-light/10 border border-primary-light/30'
                      }`}
                    aria-label={`Mudar status da OS para ${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Cliente</h4>
            {client ? (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <p className="font-semibold text-gray-900 text-lg">{client.nome} {client.vip && <span className="bg-warning/20 text-warning text-[10px] px-2 py-0.5 rounded-full font-bold">VIP</span>}</p>
                <a
                  href={getWhatsAppLink(client.contato, `Olá ${client.nome}, referente à OS #${order.numeroOs}.`, order.numeroOs)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-success flex items-center space-x-2 transition-colors"
                  aria-label={`Enviar mensagem via WhatsApp para ${client.nome} (${client.contato})`}
                >
                  <span className="text-lg text-success">📱</span>
                  <span>{client.contato}</span>
                </a>
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">Cliente não encontrado.</p>
            )}
          </div>


          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Histórico de Pagamentos</h4>
            {order.pagamentos.length === 0 ? (
              <p className="text-sm italic text-gray-400 mb-4 bg-gray-50 p-4 rounded-xl text-center border border-gray-100">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-3 mb-6">
                {order.pagamentos.map(p => (
                  <div key={p.id} className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {p.metodo === 'Pix' && '⚡'}
                          {p.metodo === 'Dinheiro' && '💵'}
                          {p.metodo === 'Cartão' && '💳'}
                        </span>
                        <span className="font-bold text-gray-800">{p.metodo}</span>
                      </div>
                      <span className="font-black text-success text-lg">{formatCurrency(p.valor)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{new Date(p.data).toLocaleDateString('pt-BR')} às {new Date(p.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {p.observacao && (
                      <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-600 italic">
                        "{p.observacao}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {order.valorPago < order.total && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <p className="font-bold text-gray-800 text-base">Registrar Novo Pagamento</p>
                <div>
                  <label htmlFor="paymentAmountInput" className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    id="paymentAmountInput"
                    className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                    value={paymentAmountInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*([.,]\d{0,2})?$/.test(value) || value === '') {
                        setPaymentAmountInput(value);
                      }
                    }}
                    placeholder="0,00"
                    aria-label="Valor do novo pagamento"
                  />
                </div>
                <div>
                  <label htmlFor="paymentMethodInput" className="block text-xs font-bold text-gray-500 uppercase mb-1">Método</label>
                  <select
                    id="paymentMethodInput"
                    className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                    value={paymentMethodInput}
                    onChange={(e) => setPaymentMethodInput(e.target.value as PaymentMethod)}
                    aria-label="Método do novo pagamento"
                  >
                    <option value="">Selecione o Método</option>
                    {Object.values(PaymentMethod).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="paymentObsInput" className="block text-xs font-bold text-gray-500 uppercase mb-1">Observação (Opcional)</label>
                  <input
                    type="text"
                    id="paymentObsInput"
                    className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none"
                    value={paymentObsInput}
                    onChange={(e) => setPaymentObsInput(e.target.value)}
                    placeholder="Ex: Pagamento parcial"
                    aria-label="Observação para o novo pagamento"
                  />
                </div>
                <button
                  onClick={handleInlinePaymentSubmit}
                  className="w-full bg-success text-white py-2 rounded-xl font-bold text-sm shadow-lg shadow-success/30 hover:bg-green-700 transition-all"
                  aria-label="Registrar pagamento"
                >
                  Registrar Pagamento
                </button>
              </div>
            )}
          </div>
          {order.observacao && (
            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Observações da OS</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap">{order.observacao}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OSDetailsModal;
