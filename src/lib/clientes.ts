import { prisma } from "@/lib/prisma";

import { clienteAtualizarSchema, clienteFormSchema, type ClienteAtualizarValues, type ClienteFormValues } from "@/lib/clientes-schema";

const clienteOrderBy = [{ criadoEm: "desc" as const }, { nome: "asc" as const }];

import { sanitizePhone } from "@/lib/sanitizers";

type ListarClientesOpcoes = {
  /** Telas operacionais (ex.: abertura de OS) só podem oferecer clientes ativos. */
  apenasAtivos?: boolean;
};

export async function listarClientes(search?: string, opcoes?: ListarClientesOpcoes) {
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

  return prisma.cliente.findMany({
    where: filtros,
    orderBy: clienteOrderBy,
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
