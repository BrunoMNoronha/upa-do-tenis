import { AppShell } from "@/components/app-shell";
import { CaixaClient } from "./caixa-client";
import {
  listarFormasPagamentoComCache as listarFormasPagamento,
  obterDadosEmpresaComCache as obterDadosEmpresa,
} from "@/lib/dados-cache";

import { exigirSessao } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  await exigirSessao({ permitirFechamento: true });

  const [formasPagamento, dadosEmpresa] = await Promise.all([listarFormasPagamento(), obterDadosEmpresa()]);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      title="Controle de Caixa"
      description="Gerencie a abertura, fechamento e movimentações do caixa."
      action={{ label: "Histórico", href: "/caixa/historico" }}
    >
      <CaixaClient formasPagamento={formasPagamento} />
    </AppShell>
  );
}
