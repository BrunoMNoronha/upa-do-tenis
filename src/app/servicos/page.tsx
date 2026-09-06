import { AppShell } from "@/components/app-shell";
import { ServicosClient } from "./servicos-client";

import { listarServicosParaGestao } from "@/lib/servicos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Serviços | UPA do Tênis",
  description: "Cadastro e consulta de serviços da sapataria.",
};

export default async function ServicosPage() {
  const servicos = await listarServicosParaGestao();

  return (
    <AppShell
      eyebrow="Catálogo"
      title="Serviços"
      description="Gerencie os serviços prestados pela sapataria."
      action={{ href: "/ordens-servico", label: "Ir para OS" }}
    >
      <ServicosClient
        servicos={servicos.map((servico) => ({
          id: servico.id,
          nome: servico.nome,
          descricao: servico.descricao,
          precoBase: Number(servico.precoBase),
          ativo: servico.ativo,
          criadoEm: servico.criadoEm.toISOString(),
        }))}
      />
    </AppShell>
  );
}
