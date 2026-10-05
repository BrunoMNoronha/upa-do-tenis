import { AppShell } from "@/components/app-shell";

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";
import { listarUsuarios } from "@/lib/usuarios";
import { UsuariosClient } from "./usuarios-client";

export const metadata = {
  title: "Usuários",
  description: "Cadastro e gestão dos usuários do sistema.",
};

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await exigirSessao();

  const [usuarios, dadosEmpresa] = await Promise.all([listarUsuarios(), obterDadosEmpresa()]);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
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
