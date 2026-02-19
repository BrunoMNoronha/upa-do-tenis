
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Client, Product, Service, PaymentMethod, OSItem, ServiceOrder } from '../types';
import { formatCurrency, parseCurrency, formatCurrencyForInput, getWhatsAppLink } from '../utils';
import { useDebounce } from '../hooks/useDebounce'; // Import the new hook

interface OSModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  products: Product[];
  services: Service[];
  ordersLength: number; // To derive next OS number
  onOpenAddClientModal: () => void;
  onSaveOS: (
    numeroOs: string,
    clienteId: string,
    dataPrevista: string,
    selectedItems: OSItem[],
    newPaymentMethod: PaymentMethod,
    initialPaymentValue: number,
    newOsObservation: string,
    totalValue: number
  ) => void;
}

const OSModalForm: React.FC<OSModalFormProps> = ({
  isOpen,
  onClose,
  clients,
  products,
  services,
  ordersLength,
  onOpenAddClientModal,
  onSaveOS,
}) => {
  // Create Form State
  const [newNumeroOs, setNewNumeroOs] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [selectedClientDisplayText, setSelectedClientDisplayText] = useState('');
  const [newDatePrev, setNewDatePrev] = useState(''); // Date string in 'YYYY-MM-DD'
  const [selectedItems, setSelectedItems] = useState<OSItem[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>(PaymentMethod.DINHEIRO);
  const [initialPaymentValue, setInitialPaymentValue] = useState(''); // As string for input, then parse to cents
  const [newOsObservation, setNewOsObservation] = useState('');

  // Search states for items and clients
  const [searchTermClient, setSearchTermClient] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  const [searchTermService, setSearchTermService] = useState('');
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const serviceSearchRef = useRef<HTMLDivElement>(null);

  const [searchTermProduct, setSearchTermProduct] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const productSearchRef = useRef<HTMLDivElement>(null);

  const [isProductAccordionOpen, setIsProductAccordionOpen] = useState(false);

  // Debounced search terms
  const debouncedSearchTermClient = useDebounce(searchTermClient, 300);
  const debouncedSearchTermService = useDebounce(searchTermService, 300);
  const debouncedSearchTermProduct = useDebounce(searchTermProduct, 300);

  // Derived state for new OS number display, used as initial editable value
  const tempNextOsNumber = useMemo(() => `#OS-${ordersLength + 1001}`, [ordersLength]);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setFilteredClients([]);
      }
      if (serviceSearchRef.current && !serviceSearchRef.current.contains(event.target as Node)) {
        setFilteredServices([]);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setFilteredProducts([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter clients based on debounced search term
  useEffect(() => {
    if (debouncedSearchTermClient.length > 0) {
      setFilteredClients(
        clients.filter(c => c.nome.toLowerCase().includes(debouncedSearchTermClient.toLowerCase()))
      );
    } else {
      setFilteredClients([]);
    }
  }, [debouncedSearchTermClient, clients]);

  // Filter services based on debounced search term
  useEffect(() => {
    if (debouncedSearchTermService.length > 0) {
      setFilteredServices(
        services.filter(s => s.nome.toLowerCase().includes(debouncedSearchTermService.toLowerCase()))
      );
    } else {
      setFilteredServices([]);
    }
  }, [debouncedSearchTermService, services]);

  // Filter products based on debounced search term
  useEffect(() => {
    if (debouncedSearchTermProduct.length > 0) {
      setFilteredProducts(
        products.filter(p => p.nome.toLowerCase().includes(debouncedSearchTermProduct.toLowerCase()))
      );
    } else {
      setFilteredProducts([]);
    }
  }, [debouncedSearchTermProduct, products]);

  // When a client is selected from the dropdown
  const handleSelectClient = useCallback((client: Client) => {
    setNewClientId(client.id);
    setSelectedClientDisplayText(client.nome);
    setSearchTermClient(''); // Clear raw search term after selection
    setFilteredClients([]); // Hide dropdown
  }, []);

  // Clear selected client
  const handleClearClient = useCallback(() => {
    setNewClientId('');
    setSelectedClientDisplayText('');
    setSearchTermClient(''); // Clear raw search term
    setFilteredClients([]);
  }, []);

  const handleAddItem = useCallback((type: 'PRODUTO' | 'SERVICO', itemToAdd: Product | Service) => {
    // Find existing item matching ID, type, AND description
    // Use an empty string for undefined descriptions to ensure consistent comparison
    const existingItemIndex = selectedItems.findIndex(item =>
      item.itemId === itemToAdd.id &&
      item.tipo === type &&
      (item.descricao || '') === (itemToAdd.descricao || '')
    );

    if (existingItemIndex > -1) {
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantidade += 1;
      setSelectedItems(updatedItems);
    } else {
      const newItem: OSItem = {
        id: crypto.randomUUID(),
        itemId: itemToAdd.id,
        tipo: type,
        nome: itemToAdd.nome,
        quantidade: 1,
        valorUnitario: itemToAdd.valor,
        descricao: itemToAdd.descricao
      };
      setSelectedItems(prev => [...prev, newItem]);
    }
    // Clear raw search term and hide dropdown after adding
    if (type === 'SERVICO') {
      setSearchTermService('');
      setFilteredServices([]);
    } else {
      setSearchTermProduct('');
      setFilteredProducts([]);
      setIsProductAccordionOpen(true); // Open product accordion when adding a product
    }
  }, [selectedItems]);

  const handleItemQuantityChange = useCallback((id: string, newQuantity: number) => {
    setSelectedItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantidade: Math.max(1, newQuantity) } : item
    ));
  }, []);

  const handleItemValueChange = useCallback((id: string, newValue: string) => {
    const parsedValue = parseCurrency(newValue);
    setSelectedItems(prev => prev.map(item =>
      item.id === id ? { ...item, valorUnitario: parsedValue } : item
    ));
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const calculateTotal = useMemo(() =>
    selectedItems.reduce((acc, item) => acc + (item.valorUnitario * item.quantidade), 0),
    [selectedItems]
  );

  const parsedInitialPayment = useMemo(() => parseCurrency(initialPaymentValue), [initialPaymentValue]);
  const calculatePending = useMemo(() => calculateTotal - parsedInitialPayment, [calculateTotal, parsedInitialPayment]);

  const resetForm = useCallback(() => {
    setNewNumeroOs('');
    setNewClientId('');
    setSelectedClientDisplayText('');
    setNewDatePrev('');
    setSelectedItems([]);
    setNewPaymentMethod(PaymentMethod.DINHEIRO);
    setInitialPaymentValue('');
    setNewOsObservation('');
    setSearchTermClient(''); // Also reset raw search terms
    setFilteredClients([]);
    setSearchTermService('');
    setFilteredServices([]);
    setSearchTermProduct('');
    setFilteredProducts([]);
    setIsProductAccordionOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!newClientId || !newDatePrev || selectedItems.length === 0) {
      alert("Por favor, selecione um cliente, uma data prevista e adicione pelo menos um item à OS.");
      return;
    }
    if (calculatePending < 0) {
      alert("O valor da entrada não pode ser maior que o total da OS.");
      return;
    }

    onSaveOS(
      newNumeroOs === tempNextOsNumber ? `OS-${ordersLength + 1001}` : newNumeroOs,
      newClientId,
      newDatePrev,
      selectedItems,
      newPaymentMethod,
      parsedInitialPayment,
      newOsObservation,
      calculateTotal
    );
    onClose();
    resetForm();
  }, [
    newClientId, newDatePrev, selectedItems, calculatePending, onSaveOS, onClose, resetForm,
    newNumeroOs, tempNextOsNumber, ordersLength, newPaymentMethod, parsedInitialPayment, newOsObservation, calculateTotal
  ]);

  // When modal opens, reset states and try to set a default date
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setNewNumeroOs(tempNextOsNumber); // Set initial editable OS number
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1); // Default to tomorrow
      setNewDatePrev(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen, tempNextOsNumber, resetForm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      aria-labelledby="newOsTitle"
    >
      <div className="bg-primary-dark text-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-8 p-8">
          {/* Left Column: OS Details */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="osNumber" className="block text-xs font-bold text-slate-400 uppercase mb-2">Número da OS</label>
                <input
                  type="text"
                  id="osNumber"
                  value={newNumeroOs}
                  onChange={(e) => setNewNumeroOs(e.target.value)}
                  className="w-full bg-gray-900 border border-slate-700 rounded-xl p-3 text-slate-300 font-semibold focus:ring-2 focus:ring-primary-light outline-none transition-all"
                  placeholder="#OS-XXX"
                  aria-label="Número da Ordem de Serviço"
                />
              </div>
              <div>
                <label htmlFor="datePrev" className="block text-xs font-bold text-slate-400 uppercase mb-2">Data Prevista</label>
                <input
                  type="date"
                  id="datePrev"
                  className="w-full bg-gray-900 border border-slate-700 rounded-xl p-3 text-slate-300 focus:ring-2 focus:ring-primary-light outline-none transition-all"
                  value={newDatePrev}
                  onChange={(e) => setNewDatePrev(e.target.value)}
                  aria-label="Data prevista para entrega"
                />
              </div>
            </div>

            <div>
              <label htmlFor="clientSearch" className="block text-xs font-bold text-slate-400 uppercase mb-2">Cliente</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1" ref={clientSearchRef}>
                  <span className="absolute left-3 text-slate-500">🔍</span>
                  <input
                    type="text"
                    id="clientSearch"
                    className={`w-full bg-gray-900 border rounded-xl p-3 pl-10 text-slate-300 focus:ring-2 focus:ring-primary-light outline-none transition-all ${newClientId ? 'border-primary-light' : 'border-slate-700'} pr-12`}
                    placeholder="Pesquisar cliente..."
                    value={newClientId ? selectedClientDisplayText : searchTermClient}
                    onChange={(e) => {
                      setSearchTermClient(e.target.value);
                      setNewClientId('');
                      setSelectedClientDisplayText('');
                    }}
                    aria-label="Pesquisar cliente"
                    aria-haspopup="listbox"
                    aria-expanded={filteredClients.length > 0}
                  />
                  {newClientId && (
                    <button
                      onClick={handleClearClient}
                      className="absolute right-3 text-slate-500 hover:text-white transition-colors text-lg"
                      title="Limpar cliente selecionado"
                      aria-label="Limpar cliente selecionado"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={onOpenAddClientModal}
                  className="flex-shrink-0 bg-accent hover:bg-primary-light text-white px-4 py-3 rounded-xl font-bold transition-colors text-lg"
                  title="Adicionar novo cliente"
                  aria-label="Adicionar novo cliente"
                >
                  +
                </button>
              </div>
              {(filteredClients.length > 0 && searchTermClient.length > 0 && !newClientId) && (
                <ul
                  className="relative z-10 w-full bg-gray-800 border border-slate-700 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg"
                  role="listbox"
                >
                  {filteredClients.map(client => (
                    <li
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className="p-3 text-slate-300 hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                      aria-label={`Selecionar cliente ${client.nome}`}
                      role="option"
                    >
                      {client.nome} {client.vip && <span className="text-warning text-xs">⭐ VIP</span>}
                    </li>
                  ))}
                </ul>
              )}
              {newClientId && selectedClientDisplayText && (
                <p className="text-success text-sm mt-2">Cliente selecionado: <span className="font-semibold">{selectedClientDisplayText}</span></p>
              )}
            </div>

            {/* Services Section */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-slate-700 space-y-6">

              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-slate-300">Serviços</h4>
                <span className="text-xs text-slate-500">
                  {selectedItems.filter(item => item.tipo === 'SERVICO').length} adicionados
                </span>
              </div>

              <div className="relative w-full" ref={serviceSearchRef}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-success outline-none"
                  placeholder="Buscar serviço..."
                  value={searchTermService}
                  onChange={(e) => setSearchTermService(e.target.value)}
                  aria-label="Buscar serviço para adicionar à OS"
                  aria-haspopup="listbox"
                  aria-expanded={filteredServices.length > 0}
                />

                {(filteredServices.length > 0 && searchTermService.length > 0) && (
                  <ul
                    className="absolute top-full z-20 w-full mt-2 bg-gray-800 border border-slate-700 rounded-xl max-h-48 overflow-y-auto shadow-xl"
                    role="listbox"
                  >
                    {filteredServices.map(s => (
                      <li
                        key={s.id}
                        onClick={() => handleAddItem('SERVICO', s)}
                        className="px-4 py-3 hover:bg-slate-700 cursor-pointer flex justify-between gap-4"
                        role="option"
                      >
                        <div>
                          <p className="text-sm text-slate-200 font-medium">{s.nome}</p>
                          {s.descricao && (
                            <p className="text-xs text-slate-400">{s.descricao}</p>
                          )}
                        </div>
                        <span className="text-sm text-primary-light whitespace-nowrap">
                          {formatCurrency(s.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3">
                {selectedItems.filter(item => item.tipo === 'SERVICO').length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-6">
                    Nenhum serviço adicionado
                  </p>
                ) : (
                  selectedItems
                    .filter(item => item.tipo === 'SERVICO')
                    .map(item => (
                      <div
                        key={item.id}
                        className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-2"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="text-slate-200 font-medium">{item.nome}</p>
                            {item.descricao && (
                              <p className="text-xs text-slate-400">{item.descricao}</p>
                            )}
                          </div>

                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-danger transition"
                            aria-label={`Remover serviço ${item.nome}`}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 items-center">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                            <input
                              type="text"
                              value={formatCurrencyForInput(item.valorUnitario)}
                              onChange={(e) => handleItemValueChange(item.id, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-7 text-sm text-center"
                              aria-label={`Valor unitário do serviço ${item.nome}`}
                            />
                          </div>

                          <input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => handleItemQuantityChange(item.id, parseInt(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 text-sm text-center"
                            aria-label={`Quantidade do serviço ${item.nome}`}
                          />

                          <div className="text-right text-sm text-slate-300 font-medium">
                            {formatCurrency(item.valorUnitario * item.quantidade)}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>


            {/* Products Section (Accordion) */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-slate-700 space-y-4">
              <button
                onClick={() => setIsProductAccordionOpen(!isProductAccordionOpen)}
                className="flex justify-between items-center w-full focus:outline-none"
                aria-expanded={isProductAccordionOpen}
                aria-controls="products-accordion-content"
              >
                <h4 className="font-bold text-lg text-slate-300">Produtos</h4>
                <span className="text-slate-400 text-xl">{isProductAccordionOpen ? '▲' : '▼'}</span>
              </button>
              <div className="relative w-full" ref={productSearchRef}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input
                  type="text"
                  className="w-full bg-primary-dark border border-slate-700 rounded-xl p-3 pl-10 text-sm text-slate-300 focus:ring-1 focus:ring-success outline-none"
                  placeholder="Buscar produto..."
                  value={searchTermProduct}
                  onChange={(e) => setSearchTermProduct(e.target.value)}
                  aria-label="Buscar produto para adicionar à OS"
                  aria-haspopup="listbox"
                  aria-expanded={filteredProducts.length > 0}
                />
                {(filteredProducts.length > 0 && searchTermProduct.length > 0) && (
                  <ul
                    className="absolute top-full z-10 w-full bg-gray-800 border border-slate-700 rounded-xl mt-1 max-h-40 overflow-y-auto shadow-lg"
                    role="listbox"
                  >
                    {filteredProducts.map(p => (
                      <li
                        key={p.id}
                        onClick={() => handleAddItem('PRODUTO', p)}
                        className="p-3 text-slate-300 text-sm hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                        aria-label={`Adicionar produto ${p.nome} com valor de ${formatCurrency(p.valor)}`}
                        role="option"
                      >
                        <span>{p.nome} <span className="text-slate-500 italic text-xs">{p.descricao}</span></span>
                        <span className="text-primary-light">{formatCurrency(p.valor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {isProductAccordionOpen && (
                <div id="products-accordion-content" className="space-y-4 pt-2 transition-all duration-300 ease-in-out">
                  <div className="space-y-3">
                    {selectedItems.filter(item => item.tipo === 'PRODUTO').length === 0 ? (
                      <p className="text-sm text-slate-500 italic text-center py-4">Nenhum produto adicionado. Busque acima.</p>
                    ) : (
                      selectedItems.filter(item => item.tipo === 'PRODUTO').map(item => (
                        <div key={item.id} className="flex flex-col bg-primary/50 p-3 rounded-xl border border-primary">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-200 font-medium">{item.nome}</span>
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                <input
                                  type="text"
                                  value={formatCurrencyForInput(item.valorUnitario)}
                                  onChange={(e) => handleItemValueChange(item.id, e.target.value)}
                                  className="w-24 bg-primary-dark border border-slate-700 rounded-lg p-1 pl-7 text-center text-sm"
                                  aria-label={`Valor unitário do produto ${item.nome}`}
                                />
                              </div>
                              <input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => handleItemQuantityChange(item.id, parseInt(e.target.value))}
                                className="w-16 bg-primary-dark border border-slate-700 rounded-lg p-1 text-center text-sm"
                                aria-label={`Quantidade do produto ${item.nome}`}
                              />
                              <button onClick={() => handleRemoveItem(item.id)} className="text-danger hover:text-red-300 transition-colors text-lg" aria-label={`Remover produto ${item.nome}`}>✕</button>
                            </div>
                          </div>
                          {item.descricao && <p className="text-xs text-slate-400 italic mt-1">{item.descricao}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Payment and Summary */}
          <div className="bg-gray-900 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">💰 Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(PaymentMethod).map(method => (
                    <button
                      key={method}
                      onClick={() => setNewPaymentMethod(method)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${newPaymentMethod === method
                        ? 'bg-success border-primary text-gray-900 shadow-md'
                        : 'bg-primary-dark border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      aria-label={`Selecionar método de pagamento ${method}`}
                    >
                      <span className="text-2xl mb-1">
                        {method === PaymentMethod.PIX && '⚡'}
                        {method === PaymentMethod.DINHEIRO && '💵'}
                        {method === PaymentMethod.CARTAO && '💳'}
                      </span>
                      <span className="text-xs font-semibold">{method}</span>
                    </button>
                  ))}
                </div>
              </div>


              {/* Observation Textarea - MOVED HERE */}
              <div>
                <label htmlFor="osObservation" className="block text-xs font-bold text-slate-400 uppercase mb-2">Observações</label>
                <textarea
                  id="osObservation"
                  rows={3}
                  className="w-full bg-gray-900 border border-slate-700 rounded-xl p-3 text-slate-300 focus:ring-2 focus:ring-primary-light outline-none transition-all resize-y"
                  value={newOsObservation}
                  onChange={(e) => setNewOsObservation(e.target.value)}
                  placeholder="Detalhes adicionais sobre a ordem de serviço..."
                  aria-label="Observações da Ordem de Serviço"
                />
              </div>

            </div>

            <div className="space-y-4 pt-6 mt-auto">
              <div>
                <label htmlFor="initialPaymentValue" className="block text-xs font-bold text-slate-400 uppercase mb-2">Valor da Entrada</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                  <input
                    type="text"
                    id="initialPaymentValue"
                    className="w-full bg-primary-dark border border-slate-700 rounded-xl p-3 pl-10 text-slate-300 font-semibold focus:ring-2 focus:ring-success outline-none transition-all"
                    value={initialPaymentValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*([.,]\d{0,2})?$/.test(value) || value === '') {
                        setInitialPaymentValue(value);
                      }
                    }}
                    placeholder="0,00"
                    aria-label="Valor da entrada do pagamento"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xl">
                <span className="text-slate-300 font-semibold">Resumo da OS:</span>
                <span className="text-success font-black">{formatCurrency(calculateTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xl">
                <span className="text-slate-300 font-semibold">Pendente:</span>
                <span className={`font-black ${calculatePending < 0 ? 'text-danger' : 'text-warning'}`}>{formatCurrency(calculatePending)}</span>
              </div>
              <button
                onClick={handleSubmit}
                className="w-full bg-success text-gray-900 py-4 rounded-xl font-black text-xl shadow-lg shadow-success/30 hover:bg-green-600 transition-all uppercase tracking-wide mt-6"
                aria-label="Salvar Ordem de Serviço"
              >
                Salvar Ordem de Serviço
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OSModalForm;
