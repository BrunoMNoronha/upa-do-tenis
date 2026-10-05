"use client";

import { AppShell } from "@/components/app-shell";
import { Button, ErrorState } from "@/components/ui";

export default function PageError() {
  return (
    <AppShell title="Página indisponível" description="Tente carregar a página novamente.">
      <ErrorState
        title="Não foi possível carregar esta página"
        description="Não foi possível consultar os dados agora. Tente novamente."
        action={<Button onClick={() => window.location.reload()}>Tentar novamente</Button>}
      />
    </AppShell>
  );
}
