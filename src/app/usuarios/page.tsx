import { AppShell } from "@/components/app-shell";

import { exigirSessao } from "@/lib/auth-server";
import { listarUsuarios } from "@/lib/usuarios";
import { UsuariosClient } from "./usuarios-client";

export const metadata = {
  title: "Usuários | UPA do Tênis",
  description: "Cadastro e gestão dos usuários do sistema.",
};

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await exigirSessao();

  const usuarios = await listarUsuarios();

  return (
    <AppShell
      eyebrow="Administração"
      title="Usuários"
      description="Cadastre e gerencie os usuários que utilizam o sistema da sapataria."
    >
      <UsuariosClient
        usuarios={usuarios.map((usuario) => ({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          ativo: usuario.ativo,
          criadoEm: usuario.criadoEm.toISOString(),
        }))}
      />
    </AppShell>
  );
}
