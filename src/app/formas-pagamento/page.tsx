import { AppShell } from "@/components/app-shell";
import { FormasPagamentoClient } from "./formas-pagamento-client";

import { listarFormasPagamentoParaGestao } from "@/lib/formas-pagamento";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Formas de Pagamento | UPA do Tênis",
  description: "Cadastro e consulta de formas de pagamento da sapataria.",
};

export default async function FormasPagamentoPage() {
  const formas = await listarFormasPagamentoParaGestao();

  return (
    <AppShell
      eyebrow="Financeiro"
      title="Formas de Pagamento"
      description="Gerencie os métodos de pagamento aceitos na loja."
      action={{ href: "/ordens-servico", label: "Ir para OS" }}
    >
      <FormasPagamentoClient
        formas={formas.map((forma) => ({
          id: forma.id,
          nome: forma.nome,
          tipo: forma.tipo,
          ativo: forma.ativo,
          possuiMovimento: forma.possuiMovimento,
        }))}
      />
    </AppShell>
  );
}
