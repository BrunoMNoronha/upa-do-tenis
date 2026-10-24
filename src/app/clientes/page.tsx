import { AppShell } from "@/components/app-shell";
import { IconeMais } from "@/components/icones";
import { Button } from "@/components/ui";
import { ClientesClient } from "./clientes-client";

import { contarEstatisticasClientes, listarClientesPaginado } from "@/lib/clientes";
import { lerFiltroStatus, statusParaAtivo } from "@/lib/cadastros-filtros";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clientes",
  description: "Cadastro e consulta de clientes da sapataria.",
};

export default async function ClientesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sessao = await exigirSessao();

  const searchParams = await props.searchParams;
  const busca = typeof searchParams.busca === "string" ? searchParams.busca.trim() : "";
  const filtroStatus = lerFiltroStatus(searchParams);
  const [{ data: clientes, pagination }, estatisticas, dadosEmpresa] = await Promise.all([
    listarClientesPaginado({
      search: busca || undefined,
      paginacao: lerPaginacaoDeSearchParams(searchParams),
      opcoes: { ativo: statusParaAtivo(filtroStatus) },
    }),
    contarEstatisticasClientes(),
    obterDadosEmpresa(),
  ]);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      usuario={sessao}
      eyebrow="Cadastro e consulta"
      title="Clientes"
      description="Base de clientes usada nas ordens de serviço e no acompanhamento por WhatsApp."
      actions={
        <Button href="#cadastro-rapido" icon={<IconeMais />}>
          Novo cliente
        </Button>
      }
    >
      <ClientesClient
        busca={busca}
        pagination={pagination}
        estatisticas={estatisticas}
        filtroStatus={filtroStatus}
        clientes={clientes.map((cliente) => ({
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          email: cliente.email,
          cpfCnpj: cliente.cpfCnpj,
          observacoes: cliente.observacoes,
          ativo: cliente.ativo,
          criadoEm: cliente.criadoEm.toISOString(),
        }))}
      />
    </AppShell>
  );
}
