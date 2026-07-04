import { AppShell } from "@/components/app-shell";
import { CaixaClient } from "./caixa-client";
import { prisma } from "@/lib/prisma";

export default async function CaixaPage() {
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
