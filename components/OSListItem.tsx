
import React from 'react';
import { ServiceOrder, Client, OSStatus } from '../types';
import { formatCurrency } from '../utils';

interface OSListItemProps {
  order: ServiceOrder;
  client: Client | undefined;
  onSelectOrder: (order: ServiceOrder) => void;
}

const OSListItem: React.FC<OSListItemProps> = ({ order, client, onSelectOrder }) => {
  return (
    <tr key={order.id} className="border-b border-gray-50 hover:bg-primary-light/5 transition-colors">
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${order.status === OSStatus.RECEBIDO ? 'bg-primary-light/20 text-primary-dark' : // Emerald Light for Received
          order.status === OSStatus.EM_ANDAMENTO ? 'bg-warning/20 text-warning' :       // Amber for In Progress
            order.status === OSStatus.AGUARDANDO_CLIENTE ? 'bg-accent/20 text-accent' : // Teal for Awaiting Client
              'bg-success/20 text-success'                                                // Green for Delivered
          }`}>
          {order.status}
        </span>
      </td>
      <td className="px-6 py-4 font-bold text-gray-800">#{order.numeroOs}</td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{client?.nome}</span>
          <span className="text-[10px] text-gray-400">{client?.contato}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-gray-500">{new Date(order.dataEntrada).toLocaleDateString('pt-BR')}</td>
      <td className="px-6 py-4">
        <span className="text-gray-900 font-medium">{new Date(order.dataPrevista).toLocaleDateString('pt-BR')}</span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end">
          <span className="font-bold text-gray-900">{formatCurrency(order.total)}</span>
          <span className={`text-[10px] font-bold ${order.valorPago >= order.total ? 'text-success' : 'text-danger'}`}>
            {order.valorPago >= order.total ? 'PAGO' : `FALTA ${formatCurrency(order.total - order.valorPago)}`}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={() => onSelectOrder(order)}
          className="text-primary hover:text-primary-dark font-bold text-xs uppercase underline"
          aria-label={`Ver detalhes da OS ${order.numeroOs}`}
        >
          Detalhes
        </button>
      </td>
    </tr>
  );
};

export default OSListItem;
