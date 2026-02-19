
import React, { useState, useEffect } from 'react';
import { Client } from '../types';

interface ClientModalProps {
  isOpen: boolean;
  client: Client | null; // Null if adding a new client
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> | Client) => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, client, onClose, onSave }) => {
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [vip, setVip] = useState(false);
  const [aceitaOfertas, setAceitaOfertas] = useState(true); // New: State for accepting offers, default true

  useEffect(() => {
    if (client) {
      setNome(client.nome);
      setContato(client.contato);
      setVip(client.vip);
      setAceitaOfertas(client.aceitaOfertas ?? true); // Use existing or default to true
    } else {
      // Reset form for new client
      setNome('');
      setContato('');
      setVip(false);
      setAceitaOfertas(true); // Default to true for new clients
    }
  }, [client, isOpen]); // Reset when modal opens or client changes

  if (!isOpen) return null;

  const handleSave = () => {
    if (!nome.trim() || !contato.trim()) {
      alert('Nome e Contato são campos obrigatórios.');
      return;
    }

    const clientData = client
      ? { ...client, nome, contato, vip, aceitaOfertas } // Existing client
      : { nome, contato, vip, aceitaOfertas }; // New client

    onSave(clientData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={onClose} // Close modal on backdrop click
         onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} // Close on Escape key
         tabIndex={-1} // Make div focusable
         aria-modal="true"
         role="dialog"
         aria-labelledby="clientModalTitle"
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()} // Prevent closing on modal content click
      >
        <div className="p-8 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 id="clientModalTitle" className="text-2xl font-black text-gray-800">{client ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</h3>
              <p className="text-sm text-gray-500">Preencha os dados do cliente</p>
            </div>
            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar modal de cliente">✕</button>
          </div>
        </div>

        <div className="flex-1 p-8 space-y-6">
          <div>
            <label htmlFor="clientName" className="block text-sm font-semibold text-gray-700 mb-2">Nome do Cliente</label>
            <input
              type="text"
              id="clientName"
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Silva"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="clientContact" className="block text-sm font-semibold text-gray-700 mb-2">Contato</label>
            <input
              type="text"
              id="clientContact"
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Ex: (11) 98765-4321"
              aria-required="true"
            />
          </div>
          <div className="flex items-center space-x-6"> {/* Group checkboxes */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="clientVip"
                className="h-5 w-5 text-accent focus:ring-accent border-gray-300 rounded"
                checked={vip}
                onChange={(e) => setVip(e.target.checked)}
                aria-label="Marcar como Cliente VIP"
              />
              <label htmlFor="clientVip" className="ml-2 block text-sm font-semibold text-gray-700">Cliente VIP</label>
            </div>
            <div className="flex items-center"> {/* New checkbox for offers */}
              <input
                type="checkbox"
                id="aceitaOfertas"
                className="h-5 w-5 text-success focus:ring-success border-gray-300 rounded"
                checked={aceitaOfertas}
                onChange={(e) => setAceitaOfertas(e.target.checked)}
                aria-label="Cliente aceita receber ofertas"
              />
              <label htmlFor="aceitaOfertas" className="ml-2 block text-sm font-semibold text-gray-700">Aceita ofertas</label>
            </div>
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
            className="px-8 py-3 bg-primary-light text-white rounded-xl font-bold shadow-lg shadow-primary-light/30 hover:bg-primary transition-all"
            aria-label="Salvar informações do cliente"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;