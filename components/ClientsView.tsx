
import React, { useState, useMemo } from 'react';
import { Client, ServiceOrder } from '../types';
import ClientDetailsModal from './ClientDetailsModal';

interface ClientsViewProps {
  clients: Client[];
  orders: ServiceOrder[]; // Pass orders for ClientDetailsModal
  onOpenAddClientModal: () => void;
  onOpenEditClientModal: (client: Client) => void;
}

const ClientsView: React.FC<ClientsViewProps> = ({ clients, orders, onOpenAddClientModal, onOpenEditClientModal }) => {
  const [filterName, setFilterName] = useState('');
  const [filterContact, setFilterContact] = useState('');
  const [filterVip, setFilterVip] = useState(false);
  const [filterAceitaOfertas, setFilterAceitaOfertas] = useState(false); // New: Filter for accepting offers

  // State for Client Details View Modal
  const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] = useState(false);
  const [clientToView, setClientToView] = useState<Client | null>(null);

  const handleOpenClientDetailsModal = (client: Client) => {
    setClientToView(client);
    setIsClientDetailsModalOpen(true);
  };

  const handleCloseClientDetailsModal = () => {
    setIsClientDetailsModalOpen(false);
    setClientToView(null);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesName = client.nome.toLowerCase().includes(filterName.toLowerCase());
      const matchesContact = client.contato.toLowerCase().includes(filterContact.toLowerCase());
      const matchesVip = !filterVip || client.vip; // If filterVip is true, only show VIPs
      const matchesAceitaOfertas = !filterAceitaOfertas || client.aceitaOfertas; // If filterAceitaOfertas is true, only show those who accept offers

      return matchesName && matchesContact && matchesVip && matchesAceitaOfertas;
    });
  }, [clients, filterName, filterContact, filterVip, filterAceitaOfertas]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Módulo de Clientes</h1>
          <p className="text-sm text-gray-500">Gerencie o cadastro de clientes e o status VIP.</p>
        </div>
        <button 
          onClick={onOpenAddClientModal}
          className="bg-primary-light text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-light/30 flex items-center hover:bg-primary transition-all"
        >
          <span className="mr-2">＋</span> Novo Cliente
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
        <div>
          <label htmlFor="filterClientName" className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Cliente</label>
          <input
            type="text"
            id="filterClientName"
            className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
            placeholder="Buscar por nome..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            aria-label="Filtrar clientes por nome"
          />
        </div>
        <div>
          <label htmlFor="filterClientContact" className="block text-xs font-bold text-gray-400 uppercase mb-1">Contato</label>
          <input
            type="text"
            id="filterClientContact"
            className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
            placeholder="Buscar por contato..."
            value={filterContact}
            onChange={(e) => setFilterContact(e.target.value)}
            aria-label="Filtrar clientes por contato"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center h-full">
            <input
              type="checkbox"
              id="filterVip"
              className="h-5 w-5 text-accent focus:ring-accent border-gray-300 rounded"
              checked={filterVip}
              onChange={(e) => setFilterVip(e.target.checked)}
              aria-label="Filtrar apenas clientes VIP"
            />
            <label htmlFor="filterVip" className="ml-2 block text-sm font-semibold text-gray-700">Somente VIP</label>
          </div>
          <div className="flex items-center h-full">
            <input
              type="checkbox"
              id="filterAceitaOfertas"
              className="h-5 w-5 text-success focus:ring-success border-gray-300 rounded"
              checked={filterAceitaOfertas}
              onChange={(e) => setFilterAceitaOfertas(e.target.checked)}
              aria-label="Filtrar apenas clientes que aceitam ofertas"
            />
            <label htmlFor="filterAceitaOfertas" className="ml-2 block text-sm font-semibold text-gray-700">Aceitam Ofertas</label>
          </div>
        </div>
        <button 
          onClick={() => {
            setFilterName('');
            setFilterContact('');
            setFilterVip(false);
            setFilterAceitaOfertas(false);
          }}
          className="bg-gray-100 text-gray-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all w-full"
          aria-label="Limpar todos os filtros de cliente"
        >
          Limpar Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredClients.length === 0 ? (
          <p className="text-gray-400 italic col-span-full py-10 text-center">Nenhum cliente encontrado com os filtros aplicados.</p>
        ) : (
          filteredClients.map(c => (
            <div key={c.id} className="p-6 border border-gray-100 rounded-2xl text-left bg-gray-50 transition-shadow hover:shadow-md">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-800 text-lg">{c.nome}</span>
                {c.vip && <span className="bg-warning/20 text-warning text-[10px] px-2 py-0.5 rounded-full font-bold">VIP</span>}
              </div>
              <p className="text-sm text-gray-500 mb-4">{c.contato}</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => onOpenEditClientModal(c)}
                  className="text-primary hover:text-primary-dark font-bold text-xs uppercase underline"
                  aria-label={`Editar cliente ${c.nome}`}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleOpenClientDetailsModal(c)}
                  className="text-gray-700 hover:text-gray-900 font-bold text-xs uppercase underline"
                  aria-label={`Ver detalhes do cliente ${c.nome}`}
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ClientDetailsModal
        isOpen={isClientDetailsModalOpen}
        client={clientToView}
        orders={orders}
        onClose={handleCloseClientDetailsModal}
      />
    </div>
  );
};

export default ClientsView;
