
export enum OSStatus {
  RECEBIDO = 'Recebido',
  EM_ANDAMENTO = 'Em andamento',
  AGUARDANDO_CLIENTE = 'Aguardando Cliente',
  ENTREGUE = 'Entregue'
}

export enum PaymentMethod {
  PIX = 'Pix',
  DINHEIRO = 'Dinheiro',
  CARTAO = 'Cartão'
}

export enum TransactionType {
  RECEITA = 'Receita',
  DESPESA = 'Despesa'
}

export interface Client {
  id: string;
  nome: string;
  contato: string;
  vip: boolean;
  aceitaOfertas?: boolean; // New: Option for client to receive offers/promotions
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  nome: string;
  descricao?: string; // Added description
  valor: number; // in cents
  estoque: number;
  createdAt: string; // Added createdAt
  updatedAt: string; // Added updatedAt
}

export interface Service {
  id: string;
  nome: string;
  descricao?: string;
  valor: number; // in cents
  createdAt: string; // Added createdAt
  updatedAt: string; // Added updatedAt
}

export interface OSItem {
  id: string;
  itemId: string;
  tipo: 'PRODUTO' | 'SERVICO';
  nome: string;
  quantidade: number;
  valorUnitario: number; // in cents
  descricao?: string; // New: Added description to OSItem
}

export interface Payment {
  id: string;
  osId: string;
  data: string;
  valor: number;
  metodo: PaymentMethod;
  observacao?: string;
}

export interface StatusHistory {
  id: string;
  osId: string;
  status: OSStatus;
  data: string;
  observacao?: string;
}

export interface ServiceOrder {
  id: string;
  numeroOs: string;
  clienteId: string;
  dataEntrada: string;
  dataPrevista: string;
  formaPagamento: PaymentMethod;
  status: OSStatus;
  itens: OSItem[];
  pagamentos: Payment[];
  historicoStatus: StatusHistory[];
  total: number;
  valorPago: number;
  createdAt: string;
  updatedAt: string;
  observacao?: string; // New: Added general observation field for the OS
}

export interface CashFlow {
  id: string;
  tipo: TransactionType;
  categoria: string;
  data: string;
  valor: number;
  descricao: string;
  osId?: string;
  metodo?: PaymentMethod;
}

// New: User interface for authentication
export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  role: 'licensed_user' | 'admin';
}
