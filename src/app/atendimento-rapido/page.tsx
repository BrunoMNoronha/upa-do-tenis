import { AppShell } from "@/components/app-shell";
import { exigirSessao } from "@/lib/auth-server";
import { listarFormasPagamento } from "@/lib/formas-pagamento";
import { listarServicos } from "@/lib/servicos";
import { AtendimentoRapidoClient } from "./atendimento-rapido-client";

export const metadata = {
  title: "Atendimento Rápido",
  description: "Registre serviços executados, entregues e pagos no mesmo momento.",
};

export const dynamic = "force-dynamic";

export default async function AtendimentoRapidoPage() {
  await exigirSessao();

  const [servicos, formasPagamento] = await Promise.all([listarServicos(), listarFormasPagamento()]);

  return (
    <AppShell
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
