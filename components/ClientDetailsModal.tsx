
import React from 'react';
import { Client, ServiceOrder, OSStatus, PaymentMethod } from '../types';

interface ClientDetailsModalProps {
  isOpen: boolean;
  client: Client | null;
  orders: ServiceOrder[];
  onClose: () => void;
}

// Helper to generate WhatsApp link
const getWhatsAppLink = (contact: string, message: string = ''): string => {
  const digitsOnly = contact.replace(/\D/g, ''); // Remove all non-digit characters

  // Basic check for Brazilian numbers (10 or 11 digits for mobile, usually prefixed with DDD)
  // If the number doesn't start with 55, prepend it.
  let formattedNumber = digitsOnly;
  if (!formattedNumber.startsWith('55') && (formattedNumber.length === 10 || formattedNumber.length === 11)) {
    formattedNumber = `55${digitsOnly}`;
  } else if (formattedNumber.length < 10) {
    // If it's too short, it's likely not a full number. For simplicity, we just use what we have.
  }
  
  const defaultMessage = 'Olá, gostaria de falar sobre seus serviços.';
  const encodedMessage = encodeURIComponent(message || defaultMessage);
  return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
};

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ isOpen, client, orders, onClose }) => {
  if (!isOpen || !client) return null;

  const clientOrders = orders.filter(order => order.clienteId === client.id);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={onClose}
         onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
         tabIndex={-1}
         aria-modal="true"
         role="dialog"
         aria-labelledby="clientDetailsModalTitle"
    >
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
           onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 id="clientDetailsModalTitle" className="text-2xl font-black text-gray-800">Detalhes do Cliente: {client.nome}</h3>
              <p className="text-sm text-gray-500">Informações completas e histórico de serviços</p>
            </div>
            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar modal de detalhes do cliente">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Client Information Section */}
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Informações Pessoais</h4>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div>
                <p className="text-sm text-gray-500 mb-1">Nome</p>
                <p className="font-semibold text-gray-900">{client.nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Contato</p>
                <a 
                  href={getWhatsAppLink(client.contato, `Olá ${client.nome}, `)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-900 hover:text-success flex items-center space-x-2 transition-colors"
                  aria-label={`Enviar mensagem via WhatsApp para ${client.nome} (${client.contato})`}
                >
                  <span className="text-lg text-success">📱</span>
                  <span>{client.contato}</span>
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status VIP</p>
                <p className="font-semibold text-gray-900">
                  {client.vip ? <span className="text-warning">Sim ⭐</span> : 'Não'}
                </p>
              </div>
              <div> {/* New: Display 'Aceita Ofertas' status */}
                <p className="text-sm text-gray-500 mb-1">Receber Ofertas</p>
                <p className="font-semibold text-gray-900">
                  {client.aceitaOfertas ? <span className="text-success">Sim ✅</span> : <span className="text-danger">Não ❌</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Desde</p>
                <p className="font-semibold text-gray-900">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Service Order History Section */}
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Histórico de Ordens de Serviço</h4>
            {clientOrders.length === 0 ? (
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center text-gray-500 italic">
                Nenhuma Ordem de Serviço registrada para este cliente.
              </div>
            ) : (
              <div className="space-y-4">
                {clientOrders.map(order => (
                  <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center transition-shadow hover:shadow-md">
                    <div>
                      <p className="font-bold text-primary text-lg">OS #{order.numeroOs}</p>
                      <p className="text-xs text-gray-500">
                        Entrada: {new Date(order.dataEntrada).toLocaleDateString('pt-BR')} | Previsão: {new Date(order.dataPrevista).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        order.status === OSStatus.RECEBIDO ? 'bg-primary-light/20 text-primary-dark' : // Emerald Light for Received
                        order.status === OSStatus.EM_ANDAMENTO ? 'bg-warning/20 text-warning' :       // Amber for In Progress
                        order.status === OSStatus.AGUARDANDO_CLIENTE ? 'bg-accent/20 text-accent' : // Teal for Awaiting Client
                        'bg-success/20 text-success'                                                // Green for Delivered
                      }`}>
                        {order.status}
                      </span>
                      <p className="font-bold text-gray-900 text-lg mt-1">R$ {(order.total / 100).toFixed(2)}</p>
                      <p className={`text-xs font-bold ${order.valorPago >= order.total ? 'text-success' : 'text-danger'}`}>
                        {order.valorPago >= order.total ? 'PAGO' : `FALTA R$ ${((order.total - order.valorPago) / 100).toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-all"
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsModal;