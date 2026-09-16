import { prisma } from "@/lib/prisma";

import { clienteAtualizarSchema, clienteFormSchema, type ClienteAtualizarValues, type ClienteFormValues } from "@/lib/clientes-schema";

const clienteOrderBy = [{ criadoEm: "desc" as const }, { nome: "asc" as const }];

// Paginação exige ordem total: `id` fecha o desempate entre registros
// criados no mesmo instante com o mesmo nome.
const clienteOrderByPaginado = [...clienteOrderBy, { id: "desc" as const }];

import { sanitizePhone } from "@/lib/sanitizers";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";

type ListarClientesOpcoes = {
  /** Telas operacionais (ex.: abertura de OS) só podem oferecer clientes ativos. */
  apenasAtivos?: boolean;
};

function montarFiltrosClientes(search?: string, opcoes?: ListarClientesOpcoes) {
  const filtros: Record<string, unknown> = {};

  if (opcoes?.apenasAtivos) {
    filtros.ativo = true;
  }

  if (search) {
    const sanitizedSearch = sanitizePhone(search);

    filtros.OR = [
      { nome: { contains: search } },
      ...(sanitizedSearch ? [{ telefone: { contains: sanitizedSearch } }] : []),
    ];
  }

  return filtros;
}

/**
 * Listagem completa (sem paginação). Mantida para telas que precisam do
 * conjunto inteiro como opções, ex.: seleção de cliente na abertura de OS.
 */
export async function listarClientes(search?: string, opcoes?: ListarClientesOpcoes) {
  return prisma.cliente.findMany({
    where: montarFiltrosClientes(search, opcoes),
    orderBy: clienteOrderBy,
  });
}

/**
 * Listagem paginada server-side da tela de Clientes e da API. `count` e
 * `findMany` usam exatamente o mesmo filtro de busca.
 */
export async function listarClientesPaginado(params: {
  search?: string;
  paginacao: PaginacaoNormalizada;
  opcoes?: ListarClientesOpcoes;
}) {
  const where = montarFiltrosClientes(params.search, params.opcoes);

  return paginarConsulta({
    paginacao: params.paginacao,
    contar: () => prisma.cliente.count({ where }),
    buscar: ({ skip, take }) =>
      prisma.cliente.findMany({
        where,
        orderBy: clienteOrderByPaginado,
        skip,
        take,
      }),
  });
}

export async function criarCliente(input: ClienteFormValues) {
  const data = clienteFormSchema.parse(input);

  return prisma.cliente.create({
    data,
  });
}

export async function atualizarCliente(id: string, input: ClienteAtualizarValues) {
  const parsed = clienteAtualizarSchema.parse(input);

  const data: {
    nome?: string;
    telefone?: string;
    email?: string;
    cpfCnpj?: string;
    observacoes?: string;
    ativo?: boolean;
  } = {};

  if (parsed.nome !== undefined) {
    data.nome = parsed.nome;
  }

  if (parsed.telefone !== undefined) {
    data.telefone = parsed.telefone;
  }

  if (parsed.email !== undefined) {
    data.email = parsed.email;
  }

  if (parsed.cpfCnpj !== undefined) {
    data.cpfCnpj = parsed.cpfCnpj;
  }

  if (parsed.observacoes !== undefined) {
    data.observacoes = parsed.observacoes;
  }

  if (parsed.ativo !== undefined) {
    data.ativo = parsed.ativo;
  }

  return prisma.cliente.update({
    where: { id },
    data,
  });
}
