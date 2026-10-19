/**
 * Preço comercial do produto TechLab+ Sapataria exibido na landing (`/`).
 *
 * O preço parte de uma Análise de Pontos de Função (APF, IFPUG, contagem não
 * ajustada) do sistema, registrada em
 * `docs/01-planejamento/planos-implementacao/LANDING_PAGE.md`. As premissas
 * comerciais ficam aqui, nomeadas, para serem ajustadas em um só lugar.
 *
 * Todos os valores monetários são centavos inteiros (regra do projeto). Este
 * módulo não lê banco nem sessão: a landing é pública e estática em conteúdo.
 */

export type ContagemApf = {
  arquivosLogicosInternos: number;
  arquivosInterfaceExterna: number;
  entradasExternas: number;
  saidasExternas: number;
  consultasExternas: number;
};

export type Premissas = {
  valorPontoFuncaoCentavos: number;
  lojasAlvo: number;
  infraMensalPorLojaCentavos: number;
  manutencaoAnualFracao: number;
  suporteMensalPorLojaCentavos: number;
  margemFracao: number;
  arredondamentoImplantacaoCentavos: number;
  arredondamentoAssinaturaCentavos: number;
};

/** Pontos de função por tipo de função (IFPUG, não ajustados). */
export const APF: ContagemApf = {
  /** Arquivos lógicos internos: 16 (OS alta, Configuração média, 14 baixas). */
  arquivosLogicosInternos: 123,
  /** Arquivos de interface externa: nenhum. */
  arquivosInterfaceExterna: 0,
  /** Entradas externas: 62 transações (cadastros, OS, pagamentos, caixa, fotos, IA). */
  entradasExternas: 219,
  /** Saídas externas: 20 (dashboard, relatórios, caixa, recibo, insights, WhatsApp). */
  saidasExternas: 98,
  /** Consultas externas: 28 (listas, detalhes, extratos, catálogo, acompanhamento). */
  consultasExternas: 105,
};

/** Premissas comerciais. Alterar aqui reflete na landing e nos testes. */
export const PREMISSAS: Premissas = {
  /** Valor cobrado por ponto de função (R$ 500,00). */
  valorPontoFuncaoCentavos: 50_000,
  /** Base de lojas sobre a qual o desenvolvimento é amortizado. */
  lojasAlvo: 20,
  /** Infraestrutura rateada por loja/mês: hospedagem, banco e armazenamento (R$ 200,00). Estimativa. */
  infraMensalPorLojaCentavos: 20_000,
  /** Manutenção evolutiva anual, como fração do valor de desenvolvimento (15% a.a.). */
  manutencaoAnualFracao: 0.15,
  /** Suporte por loja/mês (R$ 100,00). Estimativa. */
  suporteMensalPorLojaCentavos: 10_000,
  /** Margem sobre o preço final da assinatura (30%). */
  margemFracao: 0.3,
  /** Implantação arredondada para cima em múltiplos de R$ 100. */
  arredondamentoImplantacaoCentavos: 10_000,
  /** Assinatura arredondada para cima em múltiplos de R$ 10. */
  arredondamentoAssinaturaCentavos: 1_000,
};

export type PrecosLanding = {
  /** Soma dos pontos de função de todos os tipos. */
  totalPontosFuncao: number;
  /** Valor de desenvolvimento do sistema: PF × R$/PF. */
  valorDesenvolvimentoCentavos: number;
  /** Implantação por loja: valor de desenvolvimento ÷ lojas-alvo, arredondado. */
  implantacaoCentavos: number;
  /** Manutenção evolutiva rateada por loja/mês. */
  manutencaoMensalPorLojaCentavos: number;
  /** Custo mensal por loja antes da margem: infra + manutenção + suporte. */
  custoMensalPorLojaCentavos: number;
  /** Assinatura mensal por loja: custo ÷ (1 − margem), arredondada. */
  assinaturaMensalCentavos: number;
};

export function totalPontosFuncao(apf: ContagemApf = APF): number {
  return (
    apf.arquivosLogicosInternos +
    apf.arquivosInterfaceExterna +
    apf.entradasExternas +
    apf.saidasExternas +
    apf.consultasExternas
  );
}

/** Arredonda para cima ao próximo múltiplo de `multiplo` (ambos em centavos inteiros). */
export function arredondarParaCima(centavos: number, multiplo: number): number {
  if (!Number.isSafeInteger(multiplo) || multiplo <= 0) {
    throw new Error("Múltiplo de arredondamento inválido.");
  }
  return Math.ceil(centavos / multiplo) * multiplo;
}

export function calcularPrecos(apf: ContagemApf = APF, premissas: Premissas = PREMISSAS): PrecosLanding {
  const total = totalPontosFuncao(apf);
  const valorDesenvolvimentoCentavos = total * premissas.valorPontoFuncaoCentavos;

  const implantacaoCentavos = arredondarParaCima(
    Math.ceil(valorDesenvolvimentoCentavos / premissas.lojasAlvo),
    premissas.arredondamentoImplantacaoCentavos,
  );

  const manutencaoMensalPorLojaCentavos = Math.round(
    (valorDesenvolvimentoCentavos * premissas.manutencaoAnualFracao) / 12 / premissas.lojasAlvo,
  );

  const custoMensalPorLojaCentavos =
    premissas.infraMensalPorLojaCentavos +
    manutencaoMensalPorLojaCentavos +
    premissas.suporteMensalPorLojaCentavos;

  // Margem sobre o preço (não sobre o custo): preço = custo ÷ (1 − margem).
  const assinaturaMensalCentavos = arredondarParaCima(
    Math.ceil(custoMensalPorLojaCentavos / (1 - premissas.margemFracao)),
    premissas.arredondamentoAssinaturaCentavos,
  );

  return {
    totalPontosFuncao: total,
    valorDesenvolvimentoCentavos,
    implantacaoCentavos,
    manutencaoMensalPorLojaCentavos,
    custoMensalPorLojaCentavos,
    assinaturaMensalCentavos,
  };
}
