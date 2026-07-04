import { prisma } from "@/lib/prisma";

import { clienteFormSchema, type ClienteFormValues } from "@/lib/clientes-schema";

const clienteOrderBy = [{ criadoEm: "desc" as const }, { nome: "asc" as const }];

import { sanitizePhone } from "@/lib/sanitizers";

export async function listarClientes(search?: string) {
  let where = {};
  
  if (search) {
    const sanitizedSearch = sanitizePhone(search);
    
    where = {
      OR: [
        { nome: { contains: search } },
        ...(sanitizedSearch ? [{ telefone: { contains: sanitizedSearch } }] : [])
      ]
    };
  }

  return prisma.cliente.findMany({
    where,
    orderBy: clienteOrderBy,
  });
}

export async function criarCliente(input: ClienteFormValues) {
  const data = clienteFormSchema.parse(input);

  return prisma.cliente.create({
    data,
  });
}