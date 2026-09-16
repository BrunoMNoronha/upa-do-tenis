import { AppShell } from "@/components/app-shell";
import { exigirSessao } from "@/lib/auth-server";

import { OsFotosClient } from "./os-fotos-client";

export const metadata = {
  title: "Fotos da OS",
  description: "Inclusão rápida de fotos em ordens de serviço pelo celular.",
};

export const dynamic = "force-dynamic";

export default async function OsFotosPage() {
  await exigirSessao();

  return (
    <AppShell
      eyebrow="Operação e atendimento"
      title="Fotos da OS"
      description="Busque a ordem, confira o cliente e o item e tire a foto pelo celular."
    >
      <OsFotosClient />
    </AppShell>
  );
}
