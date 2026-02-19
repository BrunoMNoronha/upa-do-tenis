
import { useState, useEffect, useCallback } from 'react';
import { 
  Client, Product, Service, ServiceOrder, CashFlow, 
  OSStatus, PaymentMethod, TransactionType, Payment, OSItem, StatusHistory 
} from './types';

// Mock Initial Data
const INITIAL_CLIENTS: Client[] = [
  { id: '1', nome: 'João Silva', contato: '(11) 98888-7777', vip: true, aceitaOfertas: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', nome: 'Maria Oliveira', contato: '(11) 97777-6666', vip: false, aceitaOfertas: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', nome: 'Carlos Souza', contato: '(11) 96666-5555', vip: true, aceitaOfertas: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', nome: 'Ana Costa', contato: '(11) 95555-4444', vip: false, aceitaOfertas: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', nome: 'Cadarço Branco', descricao: 'Cadarço de algodão para tênis brancos', valor: 1500, estoque: 50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p2', nome: 'Palmilha de Silicone', descricao: 'Palmilha anatômica de silicone para conforto extra', valor: 4500, estoque: 20, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p3', nome: 'Spray Impermeabilizante', descricao: 'Protege contra água e manchas', valor: 6000, estoque: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p4', nome: 'Escova de Limpeza Premium', descricao: 'Escova de cerdas macias para limpeza delicada', valor: 3500, estoque: 40, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const INITIAL_SERVICES: Service[] = [
  { id: 's1', nome: 'Lavagem Premium', descricao: 'Lavagem completa com hidratação', valor: 8500, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 's2', nome: 'Pintura de Entressola', descricao: 'Restauração da cor original da entressola', valor: 12000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 's3', nome: 'Impermeabilização', descricao: 'Aplicação de produto impermeabilizante', valor: 4000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 's4', nome: 'Troca de Cadarço', descricao: 'Substituição de cadarços (par)', valor: 1500, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const INITIAL_ORDERS: ServiceOrder[] = [
  {
    id: 'os1',
    numeroOs: 'OS-1001',
    clienteId: '1', // João Silva
    dataEntrada: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    dataPrevista: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    formaPagamento: PaymentMethod.PIX,
    status: OSStatus.EM_ANDAMENTO,
    itens: [
      { id: 'osi1-1', itemId: 's1', tipo: 'SERVICO', nome: 'Lavagem Premium', quantidade: 1, valorUnitario: 8500 },
      { id: 'osi1-2', itemId: 'p1', tipo: 'PRODUTO', nome: 'Cadarço Branco', quantidade: 1, valorUnitario: 1500 },
    ],
    pagamentos: [
      { id: 'pay1-1', osId: 'os1', data: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), valor: 5000, metodo: PaymentMethod.PIX },
    ],
    historicoStatus: [
      { id: 'hs1-1', osId: 'os1', status: OSStatus.RECEBIDO, data: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), observacao: 'Abertura de OS' },
    ],
    total: 10000, // 8500 + 1500
    valorPago: 5000,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    observacao: 'Tênis branco, modelo casual. Cliente solicitou urgência.'
  },
  {
    id: 'os2',
    numeroOs: 'OS-1002',
    clienteId: '2', // Maria Oliveira
    dataEntrada: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    dataPrevista: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago (overdue)
    formaPagamento: PaymentMethod.CARTAO,
    status: OSStatus.ENTREGUE,
    itens: [
      { id: 'osi2-1', itemId: 's2', tipo: 'SERVICO', nome: 'Pintura de Entressola', quantidade: 1, valorUnitario: 12000 },
    ],
    pagamentos: [
      { id: 'pay2-1', osId: 'os2', data: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), valor: 12000, metodo: PaymentMethod.CARTAO },
    ],
    historicoStatus: [
      { id: 'hs2-1', osId: 'os2', status: OSStatus.RECEBIDO, data: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), observacao: 'Abertura de OS' },
      { id: 'hs2-2', osId: 'os2', status: OSStatus.EM_ANDAMENTO, data: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), observacao: 'Início da pintura' },
      { id: 'hs2-3', osId: 'os2', status: OSStatus.ENTREGUE, data: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), observacao: 'Serviço finalizado e entregue' },
    ],
    total: 12000,
    valorPago: 12000,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    observacao: 'Entressola de tênis esportivo. Cor preta.'
  },
  {
    id: 'os3',
    numeroOs: 'OS-1003',
    clienteId: '1', // João Silva
    dataEntrada: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    dataPrevista: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    formaPagamento: PaymentMethod.DINHEIRO,
    status: OSStatus.AGUARDANDO_CLIENTE,
    itens: [
      { id: 'osi3-1', itemId: 's3', tipo: 'SERVICO', nome: 'Impermeabilização', quantidade: 2, valorUnitario: 4000 },
      { id: 'osi3-2', itemId: 'p2', tipo: 'PRODUTO', nome: 'Palmilha de Silicone', quantidade: 1, valorUnitario: 4500 },
    ],
    pagamentos: [],
    historicoStatus: [
      { id: 'hs3-1', osId: 'os3', status: OSStatus.RECEBIDO, data: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), observacao: 'Abertura de OS' },
    ],
    total: 12500, // (2*4000) + 4500
    valorPago: 0,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    observacao: 'Cliente ainda não aprovou orçamento para impermeabilização de 2 pares.'
  },
];

const INITIAL_CASHFLOW: CashFlow[] = [
  { id: 'cf1', tipo: TransactionType.RECEITA, categoria: 'Entrada OS', data: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), valor: 5000, descricao: 'Pagamento ref. OS #OS-1001', osId: 'os1', metodo: PaymentMethod.PIX },
  { id: 'cf2', tipo: TransactionType.RECEITA, categoria: 'Entrada OS', data: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), valor: 12000, descricao: 'Pagamento ref. OS #OS-1002', osId: 'os2', metodo: PaymentMethod.CARTAO },
  { id: 'cf3', tipo: TransactionType.DESPESA, categoria: 'Material de Limpeza', data: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), valor: 2500, descricao: 'Compra de produtos de limpeza', osId: undefined, metodo: undefined },
  { id: 'cf4', tipo: TransactionType.DESPESA, categoria: 'Aluguel', data: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), valor: 15000, descricao: 'Aluguel mensal da loja', osId: undefined, metodo: undefined },
];


export const useStore = (useMockData: boolean) => {
  const [clients, setClients] = useState<Client[]>(() => {
    if (useMockData) return INITIAL_CLIENTS;
    const saved = localStorage.getItem('upa_clients');
    return saved ? JSON.parse(saved) : [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    if (useMockData) return INITIAL_PRODUCTS;
    const saved = localStorage.getItem('upa_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [services, setServices] = useState<Service[]>(() => {
    if (useMockData) return INITIAL_SERVICES;
    const saved = localStorage.getItem('upa_services');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<ServiceOrder[]>(() => {
    if (useMockData) return INITIAL_ORDERS;
    const saved = localStorage.getItem('upa_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [cashFlow, setCashFlow] = useState<CashFlow[]>(() => {
    if (useMockData) return INITIAL_CASHFLOW;
    const saved = localStorage.getItem('upa_cashflow');
    return saved ? JSON.parse(saved) : [];
  });

  // Only save to local storage if not in mock data mode
  useEffect(() => {
    if (!useMockData) {
      localStorage.setItem('upa_clients', JSON.stringify(clients));
    }
  }, [clients, useMockData]);

  useEffect(() => {
    if (!useMockData) {
      localStorage.setItem('upa_products', JSON.stringify(products));
    }
  }, [products, useMockData]);

  useEffect(() => {
    if (!useMockData) {
      localStorage.setItem('upa_services', JSON.stringify(services));
    }
  }, [services, useMockData]);

  useEffect(() => {
    if (!useMockData) {
      localStorage.setItem('upa_orders', JSON.stringify(orders));
    }
  }, [orders, useMockData]);

  useEffect(() => {
    if (!useMockData) {
      localStorage.setItem('upa_cashflow', JSON.stringify(cashFlow));
    }
  }, [cashFlow, useMockData]);

  // Operations
  const addClient = (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newClient: Client = {
      ...client,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aceitaOfertas: client.aceitaOfertas ?? true, // Default to true if not provided
    };
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
  };

  const addProduct = (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setProducts(prev => [...prev, { ...prod, id: crypto.randomUUID(), createdAt: now, updatedAt: now }]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  };

  const addService = (serv: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setServices(prev => [...prev, { ...serv, id: crypto.randomUUID(), createdAt: now, updatedAt: now }]);
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s));
  };

  const addTransaction = (transaction: Omit<CashFlow, 'id'>) => {
    setCashFlow(prev => [...prev, { ...transaction, id: crypto.randomUUID() }]);
  };

  // Define the type for the data parameter in createOrder
  type CreateOrderData = Omit<ServiceOrder, 'id' | 'valorPago' | 'status' | 'historicoStatus' | 'createdAt' | 'updatedAt' | 'pagamentos'> & {
    numeroOs?: string; // Make numeroOs optional as it can be user-provided or auto-generated
  };

  const createOrder = (orderData: CreateOrderData) => {
    const id = crypto.randomUUID();
    // Use provided numeroOs if available, otherwise generate
    const numeroOs = orderData.numeroOs || `OS-${orders.length + 1001}`;
    const now = new Date().toISOString();
    
    const initialStatus: StatusHistory = {
      id: crypto.randomUUID(),
      osId: id,
      status: OSStatus.RECEBIDO,
      data: now,
      observacao: 'Abertura de OS'
    };

    const newOrder: ServiceOrder = {
      ...orderData,
      id,
      numeroOs,
      valorPago: 0,
      status: OSStatus.RECEBIDO,
      pagamentos: [],
      historicoStatus: [initialStatus],
      createdAt: now,
      updatedAt: now,
    };

    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  };

  const updateOrderStatus = (osId: string, status: OSStatus, obs?: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === osId) {
        const history: StatusHistory = {
          id: crypto.randomUUID(),
          osId,
          status,
          data: new Date().toISOString(),
          observacao: obs
        };
        return {
          ...order,
          status,
          historicoStatus: [...order.historicoStatus, history],
          updatedAt: new Date().toISOString()
        };
      }
      return order;
    }));
  };

  const addPayment = (osId: string, valor: number, metodo: PaymentMethod, obs?: string) => {
    const now = new Date().toISOString();
    const paymentId = crypto.randomUUID();
    
    setOrders(prev => prev.map(order => {
      if (order.id === osId) {
        const newPayment: Payment = {
          id: paymentId,
          osId,
          data: now,
          valor,
          metodo,
          observacao: obs
        };
        return {
          ...order,
          pagamentos: [...order.pagamentos, newPayment],
          valorPago: order.valorPago + valor,
          updatedAt: now
        };
      }
      return order;
    }));

    // Logic for Cash Flow
    addTransaction({
      tipo: TransactionType.RECEITA,
      categoria: 'Entrada OS',
      data: now,
      valor,
      descricao: `Pagamento ref. OS #${orders.find(o => o.id === osId)?.numeroOs}`,
      osId,
      metodo
    });
  };

  return {
    clients, products, services, orders, cashFlow,
    addClient, updateClient, addProduct, updateProduct, addService, updateService,
    createOrder, updateOrderStatus, addPayment, addTransaction
  };
};