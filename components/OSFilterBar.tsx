
import React from 'react';
import { OSStatus } from '../types';

interface OSFilterBarProps {
  filterStatus: OSStatus | 'all';
  setFilterStatus: (status: OSStatus | 'all') => void;
  filterClientName: string;
  setFilterClientName: (name: string) => void;
  filterOsNumber: string;
  setFilterOsNumber: (osNumber: string) => void;
  filterStartDate: string;
  setFilterStartDate: (date: string) => void;
  filterEndDate: string;
  setFilterEndDate: (date: string) => void;
  handleClearFilters: () => void;
}

const OSFilterBar: React.FC<OSFilterBarProps> = ({
  filterStatus,
  setFilterStatus,
  filterClientName,
  setFilterClientName,
  filterOsNumber,
  setFilterOsNumber,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
  handleClearFilters,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
      <div>
        <label htmlFor="filterStatus" className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
        <select
          id="filterStatus"
          className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as OSStatus | 'all')}
          aria-label="Filtrar por status da ordem de serviço"
        >
          <option value="all">Todos</option>
          {Object.values(OSStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filterClientName" className="block text-xs font-bold text-gray-400 uppercase mb-1">Cliente</label>
        <input
          type="text"
          id="filterClientName"
          className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
          placeholder="Nome do cliente..."
          value={filterClientName}
          onChange={(e) => setFilterClientName(e.target.value)}
          aria-label="Filtrar por nome do cliente"
        />
      </div>
      <div>
        <label htmlFor="filterOsNumber" className="block text-xs font-bold text-gray-400 uppercase mb-1">Número da OS</label>
        <input
          type="text"
          id="filterOsNumber"
          className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
          placeholder="Ex: OS-1001"
          value={filterOsNumber}
          onChange={(e) => setFilterOsNumber(e.target.value)}
          aria-label="Filtrar por número da ordem de serviço"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="filterStartDate" className="block text-xs font-bold text-gray-400 uppercase mb-1">De</label>
          <input
            type="date"
            id="filterStartDate"
            className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            aria-label="Filtrar por data de entrada inicial"
          />
        </div>
        <div>
          <label htmlFor="filterEndDate" className="block text-xs font-bold text-gray-400 uppercase mb-1">Até</label>
          <input
            type="date"
            id="filterEndDate"
            className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-light outline-none transition-all"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            aria-label="Filtrar por data de entrada final"
          />
        </div>
      </div>
      <button
        onClick={handleClearFilters}
        className="bg-neutral-light text-gray-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all w-full"
        aria-label="Limpar todos os filtros"
      >
        Limpar Filtros
      </button>
    </div>
  );
};

export default OSFilterBar;
