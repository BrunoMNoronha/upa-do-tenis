import { CONTAINER } from "./landing-estilos";

const REGRAS = [
  {
    titulo: "Valores sempre em centavos",
    texto: "Nenhum cálculo com arredondamento escondido. O que o cliente paga é o que aparece no caixa e no relatório.",
  },
  {
    titulo: "Estorno só com motivo",
    texto: "Todo estorno e cancelamento exige justificativa e fica registrado com quem fez e quando.",
  },
  {
    titulo: "Pagamento exige caixa aberto",
    texto: "Ordens e atendimentos rápidos só recebem pagamento com o caixa do dia aberto. Fechou o caixa, fechou a conta.",
  },
  {
    titulo: "Sem lançamento duplicado",
    texto: "Clique duas vezes no botão e o pagamento entra uma vez só. Proteção contra duplicidade nas operações financeiras.",
  },
  {
    titulo: "Extrato de estoque imutável",
    texto: "Entradas, saídas e ajustes de produtos e insumos ficam em um histórico que ninguém edita depois.",
  },
  {
    titulo: "Login protegido",
    texto: "Limite de tentativas, verificação anti-robô e sessão que expira em 8 horas. Cada ação registra o usuário que a fez.",
  },
] as const;

export function LandingSeguranca() {
  return (
    <section className="bg-[color:var(--lp-ink)] text-white">
      <div className={`${CONTAINER} flex flex-col gap-12 py-24`}>
        <div className="flex max-w-3xl flex-col gap-3.5">
          <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9FD3BC]">Controle e segurança</span>
          <h2 className="text-balance text-[2rem] font-bold leading-[1.1] tracking-[-0.02em] [font-family:var(--lp-display)] sm:text-[2.6rem]">
            Dinheiro e estoque com rastro de tudo
          </h2>
          <p className="text-pretty text-lg leading-relaxed text-[#C9CCD1]">
            Regras pensadas para o dia a dia do balcão, onde um clique duplo ou um estorno sem explicação viram prejuízo.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REGRAS.map((regra) => (
            <li key={regra.titulo} className="flex flex-col gap-2.5 rounded-xl border border-white/15 p-6">
              <h3 className="text-lg font-semibold">{regra.titulo}</h3>
              <p className="text-pretty text-[15px] leading-relaxed text-[#C9CCD1]">{regra.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
