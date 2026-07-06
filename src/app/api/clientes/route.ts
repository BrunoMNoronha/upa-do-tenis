import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi } from "@/lib/auth-server";
import { criarCliente, listarClientes } from "@/lib/clientes";
import { clienteFormSchema } from "@/lib/clientes-schema";

export async function GET(request: NextRequest) {
  const naoAutenticado = await exigirSessaoApi(request);
  if (naoAutenticado) return naoAutenticado;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const clientes = await listarClientes(search);

  return NextResponse.json({ clientes });
}

export async function POST(request: NextRequest) {
  const naoAutenticado = await exigirSessaoApi(request);
  if (naoAutenticado) return naoAutenticado;

  const payload = await request.json();
  const parsed = clienteFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Revise os campos do cliente.",
        errors: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const cliente = await criarCliente(parsed.data);

  return NextResponse.json({ cliente }, { status: 201 });
}