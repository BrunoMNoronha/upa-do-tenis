
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ServiceOrder, Client, Product, Service,
  OSStatus, PaymentMethod, OSItem
} from '../types';
import { formatCurrency } from '../utils'; // Import utils for main component
import OSModalForm from './OSModalForm';
import OSDetailsModal from './OSDetailsModal';
import OSFilterBar from './OSFilterBar';
import OSListItem from './OSListItem';

interface OSProps {
  orders: ServiceOrder[];
  clients: Client[];
  products: Product[];
  services: Service[];
  createOrder: (data: Omit<ServiceOrder, 'id' | 'valorPago' | 'status' | 'historicoStatus' | 'createdAt' | 'updatedAt' | 'pagamentos'> & { numeroOs?: string; }) => ServiceOrder;
  updateStatus: (id: string, status: OSStatus, obs?: string) => void;
  addPayment: (id: string, valor: number, metodo: PaymentMethod, obs?: string) => void;
  onOpenAddClientModal: () => void; // New prop for quick client add
}

const ServiceOrders: React.FC<OSProps> = React.memo(({ orders, clients, products, services, createOrder, updateStatus, addPayment, onOpenAddClientModal }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  // Filter states for the main OS list
  const [filterStatus, setFilterStatus] = useState<OSStatus | 'all'>('all');
  const [filterClientName, setFilterClientName] = useState('');
  const [filterOsNumber, setFilterOsNumber] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const handleClearFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterClientName('');
    setFilterOsNumber('');
    setFilterStartDate('');
    setFilterEndDate('');
  }, []);

  const handleSaveOS = useCallback((
    numeroOs: string,
    clienteId: string,
    dataPrevista: string,
    selectedItems: OSItem[],
    newPaymentMethod: PaymentMethod,
    initialPaymentValue: number,
    newOsObservation: string,
    totalValue: number
  ) => {
    const newOrder = createOrder({
      numeroOs: numeroOs,
      clienteId: clienteId,
      dataEntrada: new Date().toISOString(),
      dataPrevista: new Date(dataPrevista).toISOString(),
      formaPagamento: newPaymentMethod,
      itens: selectedItems,
      total: totalValue,
      observacao: newOsObservation,
    });

    if (initialPaymentValue > 0) {
      addPayment(newOrder.id, initialPaymentValue, newPaymentMethod);
    }
  }, [createOrder, addPayment]);

  // Memoized and filtered orders for the main table
  const filteredAndSortedOrders = useMemo(() => {
    let currentOrders = [...orders];

    if (filterStatus !== 'all') {
      currentOrders = currentOrders.filter(order => order.status === filterStatus);
    }
    if (filterClientName) {
      currentOrders = currentOrders.filter(order => {
        const client = clients.find(c => c.id === order.clienteId);
        return client?.nome.toLowerCase().includes(filterClientName.toLowerCase());
      });
    }
    if (filterOsNumber) {
      currentOrders = currentOrders.filter(order => order.numeroOs.toLowerCase().includes(filterOsNumber.toLowerCase()));
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate);
      currentOrders = currentOrders.filter(order => new Date(order.dataEntrada).getTime() >= start.getTime());
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      currentOrders = currentOrders.filter(order => new Date(order.dataEntrada).getTime() <= end.getTime());
    }

    return currentOrders.sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime());
  }, [orders, clients, filterStatus, filterClientName, filterOsNumber, filterStartDate, filterEndDate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ordens de Serviço</h1>
          <p className="text-sm text-gray-500">Gerencie todos os trabalhos em andamento</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-primary-light text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-light/30 flex items-center hover:bg-primary transition-all"
          aria-label="Abrir formulário para criar nova ordem de serviço"
        >
          <span className="mr-2">＋</span> Nova OS
        </button>
      </div>

      <OSFilterBar
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterClientName={filterClientName}
        setFilterClientName={setFilterClientName}
        filterOsNumber={filterOsNumber}
        setFilterOsNumber={setFilterOsNumber}
        filterStartDate={filterStartDate}
        setFilterStartDate={setFilterStartDate}
        filterEndDate={filterEndDate}
        setFilterEndDate={setFilterEndDate}
        handleClearFilters={handleClearFilters}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">OS #</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Entrada</th>
              <th className="px-6 py-4">Previsão</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredAndSortedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-20 text-gray-400 italic">Nenhuma OS encontrada com os filtros aplicados.</td>
              </tr>
            ) : filteredAndSortedOrders.map(order => {
              const client = clients.find(c => c.id === order.clienteId);
              return (
                <OSListItem
                  key={order.id}
                  order={order}
                  client={client}
                  onSelectOrder={setSelectedOrder}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <OSModalForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        clients={clients}
        products={products}
        services={services}
        ordersLength={orders.length}
        onOpenAddClientModal={onOpenAddClientModal}
        onSaveOS={handleSaveOS}
      />

      {selectedOrder && (
        <OSDetailsModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          clients={clients}
          updateStatus={updateStatus}
          addPayment={addPayment}
        />
      )}
    </div>
  );
});

export default ServiceOrders;
