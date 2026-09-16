import { AcompanhamentoIndisponivelView } from "./acompanhamento-view";
import { obterDadosEmpresa } from "@/lib/configuracoes";

export default async function AcompanhamentoNaoEncontrado() {
  return <AcompanhamentoIndisponivelView dadosEmpresa={await obterDadosEmpresa()} />;
}
