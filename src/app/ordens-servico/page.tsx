import { AppShell } from "@/components/app-shell";
import { OrdensServicoClient } from "./ordens-servico-client";

import { listarOrdensServico } from "@/lib/ordens-servico";
import { listarClientes } from "@/lib/clientes";
import { listarServicos } from "@/lib/servicos";

export const metadata = {
  title: "Ordens de Serviço | UPA do Tênis",
  description: "Listagem e cadastro inicial de ordens de serviço.",
};

export default async function OrdensServicoPage() {
  const ordens = await listarOrdensServico();
  const clientes = await listarClientes();
  const servicos = await listarServicos();

  return (
    <AppShell
      eyebrow="Operação e atendimento"
      title="Ordens de Serviço"
      description="Acompanhe a fila de ordens, consulte os campos principais e cadastre novas OS integradas ao banco de dados."
      action={{ href: "/ordens-servico#nova-ordem", label: "Nova ordem" }}
    >
      <OrdensServicoClient 
        initialOrders={ordens} 
        clientes={clientes} 
        servicos={servicos} 
      />
    </AppShell>
  );
}