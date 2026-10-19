import { CONTAINER, EYEBROW, TITULO_SECAO } from "./landing-estilos";

const PERGUNTAS = [
  {
    pergunta: "Funciona no celular?",
    resposta:
      "Sim. É um sistema web que se adapta à tela do celular, do tablet e do computador. A tela de fotos foi feita para o celular, com a câmera traseira abrindo direto.",
  },
  {
    pergunta: "Preciso instalar alguma coisa?",
    resposta: "Não. Abre no navegador, com login e senha. Não há aplicativo para baixar nem servidor para manter na loja.",
  },
  {
    pergunta: "Onde ficam os meus dados?",
    resposta:
      "Em um banco de dados na nuvem, acessível só com o login da sua equipe. As fotos dos calçados ficam em armazenamento privado, nunca em link público.",
  },
  {
    pergunta: "Quantas pessoas podem usar?",
    resposta:
      "Cadastre quantos usuários a loja tiver. Cada ação fica registrada com quem a fez, e um usuário pode ser desativado a qualquer momento.",
  },
] as const;

/**
 * Perguntas em `<details>` nativos com o mesmo `name`: um aberto por vez,
 * texto pesquisável pelo "Localizar na página" e acessível sem JavaScript.
 */
export function LandingFaq() {
  return (
    <section id="faq" className="border-y border-[color:var(--lp-border)] bg-white">
      <div className={`${CONTAINER} flex flex-wrap gap-14 py-24`}>
        <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-3.5">
          <span className={EYEBROW}>Perguntas frequentes</span>
          <h2 className={TITULO_SECAO}>Antes de começar</h2>
        </div>
        <div className="flex min-w-0 flex-[2_1_30rem] flex-col border-t border-[color:var(--lp-border)]">
          {PERGUNTAS.map((item) => (
            <details key={item.pergunta} name="faq" className="group border-b border-[color:var(--lp-border)]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold text-[color:var(--lp-ink)] [&::-webkit-details-marker]:hidden">
                {item.pergunta}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-2xl font-light leading-none text-[color:var(--lp-muted)] transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="text-pretty pb-6 text-base leading-relaxed text-[color:var(--lp-muted)]">{item.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
