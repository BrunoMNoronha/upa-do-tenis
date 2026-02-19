
import React, { useState, useEffect } from 'react';
import { Service } from '../types';

interface ServiceModalProps {
  isOpen: boolean;
  service: Service | null; // Null if adding a new service
  onClose: () => void;
  onSave: (serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'> | Service) => void;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, service, onClose, onSave }) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(''); // Store as string for input

  useEffect(() => {
    if (service) {
      setNome(service.nome);
      setDescricao(service.descricao || '');
      setValor((service.valor / 100).toFixed(2).replace('.', ',')); // Convert cents to R$ for display with comma
    } else {
      // Reset form for new service
      setNome('');
      setDescricao('');
      setValor('');
    }
  }, [service, isOpen]); // Reset when modal opens or service changes

  if (!isOpen) return null;

  const handleSave = () => {
    // Allow both comma and dot for input, then convert to dot for parseFloat
    const parsedValor = parseFloat(valor.replace(',', '.'));

    if (!nome.trim() || isNaN(parsedValor) || parsedValor <= 0) {
      alert('Por favor, preencha o nome e um valor válido (>0).');
      return;
    }

    const serviceData = service
      ? { ...service, nome, descricao, valor: Math.round(parsedValor * 100) }
      : { nome, descricao, valor: Math.round(parsedValor * 100) };

    onSave(serviceData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={onClose}
         onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
         tabIndex={-1}
         aria-modal="true"
         role="dialog"
         aria-labelledby="serviceModalTitle"
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 id="serviceModalTitle" className="text-2xl font-black text-gray-800">{service ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h3>
              <p className="text-sm text-gray-500">Preencha os dados do serviço</p>
            </div>
            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar modal de serviço">✕</button>
          </div>
        </div>

        <div className="flex-1 p-8 space-y-6">
          <div>
            <label htmlFor="serviceName" className="block text-sm font-semibold text-gray-700 mb-2">Nome do Serviço</label>
            <input
              type="text"
              id="serviceName"
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Lavagem Premium"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="serviceDescription" className="block text-sm font-semibold text-gray-700 mb-2">Descrição (Opcional)</label>
            <textarea
              id="serviceDescription"
              rows={3}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all resize-y"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Lavagem completa com hidratação e limpeza interna."
              aria-label="Descrição do serviço"
            />
          </div>
          <div>
            <label htmlFor="serviceValue" className="block text-sm font-semibold text-gray-700 mb-2">Valor (R$)</label>
            <input
              type="text"
              id="serviceValue"
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
              value={valor}
              onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and a single comma/dot for decimal, then convert to comma for display
                  if (/^\d*([.,]\d{0,2})?$/.test(value) || value === '') {
                      setValor(value.replace('.', ',')); // Keep comma for display
                  }
              }}
              placeholder="Ex: 85,00"
              aria-required="true"
            />
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
            aria-label="Salvar informações do serviço"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;