import { AppShell } from "@/components/app-shell";
import { exigirSessao } from "@/lib/auth-server";
import {
  listarFormasPagamentoComCache as listarFormasPagamento,
  listarServicosComCache as listarServicos,
  obterDadosEmpresaComCache as obterDadosEmpresa,
} from "@/lib/dados-cache";
import { AtendimentoRapidoClient } from "./atendimento-rapido-client";

export const metadata = {
  title: "Atendimento Rápido",
  description: "Registre serviços executados, entregues e pagos no mesmo momento.",
};

export const dynamic = "force-dynamic";

export default async function AtendimentoRapidoPage() {
  await exigirSessao();

  const [servicos, formasPagamento, dadosEmpresa] = await Promise.all([
    listarServicos(),
    listarFormasPagamento(),
    obterDadosEmpresa(),
  ]);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      eyebrow="Atendimento"
      title="Atendimento Rápido"
      description="Para serviços feitos na hora e pagos na entrega, sem cliente e sem ordem de serviço. O pagamento entra no caixa aberto."
    >
      <AtendimentoRapidoClient
        servicos={servicos.map((servico) => ({
          id: servico.id,
          nome: servico.nome,
          precoBase: servico.precoBase.toString(),
        }))}
        formasPagamento={formasPagamento.map((forma) => ({ id: forma.id, nome: forma.nome }))}
      />
    </AppShell>
  );
}
