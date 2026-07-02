const highlights = [
  "Clientes",
  "Ordens de serviço",
  "Itens e serviços",
  "Pagamentos",
  "Histórico de status",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10 lg:px-10">
      <section className="grid w-full gap-8 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[2rem] border border-black/5 bg-white/75 p-8 shadow-soft backdrop-blur">
          <span className="inline-flex rounded-full bg-accentSoft px-4 py-1 text-sm font-semibold text-accent">
            MVP v1 em preparação
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-ink md:text-6xl">
            UPA do Tênis - Sapataria Alves
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
            Base inicial do sistema web para controlar clientes, ordens de serviço, itens, serviços,
            pagamentos e histórico operacional da sapataria.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {highlights.map((item) => (
              <span key={item} className="rounded-full border border-black/10 bg-surface px-4 py-2 text-sm text-ink">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-black/5 bg-[#fcfaf7] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Próximo passo
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Implementar a camada de cadastro e consulta com persistência em SQLite, mantendo o saldo calculado no backend.
            </p>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-black/5 bg-[#1f2937] p-8 text-white shadow-soft">
          <p className="text-sm uppercase tracking-[0.18em] text-[#f5d7bf]">Escopo do núcleo</p>
          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-200">
            <p>Cadastro e listagem de clientes.</p>
            <p>Cadastro e consulta de ordens de serviço.</p>
            <p>Itens por OS, serviços por item e pagamentos independentes.</p>
            <p>Status com histórico e entrega da OS inteira.</p>
          </div>
          <div className="mt-8 rounded-3xl bg-white/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#f5d7bf]">Base técnica</p>
            <p className="mt-2 text-sm leading-6 text-slate-100">
              Next.js, TypeScript, Prisma, SQLite, Tailwind CSS, Zod e React Hook Form.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}