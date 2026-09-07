import { AppShell } from "@/components/app-shell";
import { CaixaClient } from "./caixa-client";
import { prisma } from "@/lib/prisma";

import { exigirSessao } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  await exigirSessao();

  const formasPagamento = await prisma.formaPagamento.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, tipo: true },
  });

  return (
    <AppShell
      title="Controle de Caixa"
      description="Gerencie a abertura, fechamento e movimentações do caixa."
      action={{ label: "Histórico", href: "/caixa/historico" }}
    >
      <CaixaClient formasPagamento={formasPagamento} />
    </AppShell>
  );
}
