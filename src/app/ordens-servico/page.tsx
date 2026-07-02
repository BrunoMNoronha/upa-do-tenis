import { AppShell } from "@/components/app-shell";
import { OrdensServicoClient } from "./ordens-servico-client";

export const metadata = {
  title: "Ordens de Serviço | UPA do Tênis",
  description: "Listagem e cadastro inicial de ordens de serviço com dados locais mockados.",
};

export default function OrdensServicoPage() {
  return (
    <AppShell
      eyebrow="Operação e atendimento"
      title="Ordens de Serviço"
      description="Acompanhe a fila de ordens, consulte os campos principais e cadastre novas OS em memória local para testar o fluxo do balcão."
      action={{ href: "/ordens-servico#nova-ordem", label: "Nova ordem" }}
    >
      <OrdensServicoClient />
    </AppShell>
  );
}