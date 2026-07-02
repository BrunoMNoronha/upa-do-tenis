import { prisma } from "@/lib/prisma";

import { clienteFormSchema, type ClienteFormValues } from "@/lib/clientes-schema";

const clienteOrderBy = [{ criadoEm: "desc" as const }, { nome: "asc" as const }];

export async function listarClientes() {
  return prisma.cliente.findMany({
    orderBy: clienteOrderBy,
  });
}

export async function criarCliente(input: ClienteFormValues) {
  const data = clienteFormSchema.parse(input);

  return prisma.cliente.create({
    data,
  });
}