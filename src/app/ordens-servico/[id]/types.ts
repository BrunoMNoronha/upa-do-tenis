export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  cpfCnpj?: string | null;
};

export type ServicoItem = {
  id: string;
  valor: number;
  servico?: {
    id: string;
    nome: string;
    precoBase?: number;
  } | null;
};

export type ItemOS = {
  id: string;
  tipoItem: string;
  descricao: string;
  valor: number;
  observacoes?: string | null;
  servicos: ServicoItem[];
  insumos: InsumoAplicado[];
};

export type InsumoAplicado = {
  id: string;
  quantidade: number;
  custoUnitarioAplicado: number;
  custoTotalAplicado: number;
  observacoes?: string | null;
  insumo: {
    id: string;
    nome: string;
    unidadeMedida?: string;
  };
};

export type InsumoDisponivel = {
  id: string;
  nome: string;
  unidadeMedida: string;
};

export type ServicoDisponivel = {
  id: string;
  nome: string;
  precoBase: number;
};

export type FormaPagamento = {
  id: string;
  nome: string;
  tipo?: string | null;
};

export type Pagamento = {
  id: string;
  tipo: string;
  valor: number;
  dataPagamento: string;
  observacoes?: string | null;
  formaPagamento: FormaPagamento;
};

export type HistoricoStatus = {
  id: string;
  statusAnterior?: string | null;
  statusNovo: string;
  observacao?: string | null;
  criadoEm: string;
};

export type ResumoFinanceiro = {
  valorTotal: number;
  valorDesconto: number;
  valorSinal: number;
  valorPago: number;
  saldo: number;
  statusFinanceiro: "PENDENTE" | "PARCIAL" | "PAGO" | "CANCELADO";
};

export type OrdemServicoDetalhe = {
  id: string;
  numero: string;
  status: string;
  dataEntrada: string;
  dataPrevisao: string;
  dataConclusao?: string | null;
  observacoes?: string | null;
  cliente: Cliente;
  itens: ItemOS[];
  pagamentos: Pagamento[];
  historicosStatus: HistoricoStatus[];
  resumoFinanceiro: ResumoFinanceiro;
};

export type EstadoTela = "carregando" | "erro" | "nao-encontrada" | "sucesso";

export type PagamentoFormValues = {
  formaPagamentoId: string;
  valor: string;
  dataPagamento: string;
  observacoes: string;
};

export type InsumoFormValues = {
  itemOrdemServicoId: string;
  insumoId: string;
  quantidade: string;
  custoUnitarioAplicado: string;
  observacoes: string;
};
