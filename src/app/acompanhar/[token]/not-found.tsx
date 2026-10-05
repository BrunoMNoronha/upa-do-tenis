import { AcompanhamentoIndisponivelView } from "./acompanhamento-view";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export default async function AcompanhamentoNaoEncontrado() {
  return <AcompanhamentoIndisponivelView dadosEmpresa={await obterDadosEmpresa()} />;
}
