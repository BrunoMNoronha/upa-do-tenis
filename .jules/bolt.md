## 2024-05-19 — Otimizações com Prisma em áreas financeiras exigem mapeamento exato

**Learning:** Ao tentar evitar uma consulta redundante no banco (reutilizando objetos em memória) e concatenando um novo registro recém-criado, descobri que o objeto criado no Prisma retorna por padrão apenas campos escalares. Ao passar esse objeto (que representava um pagamento) para um cálculo financeiro, a falta de propriedades relacionais (como "estorno") causou regressões silenciosas na lógica, identificadas durante o code review e nos testes rigorosos da suíte.

**Action:** Sempre que reaproveitar e injetar novos objetos do Prisma em memória que serão processados por rotinas genéricas, simule fielmente a estrutura relacional ausente (e.g., adicionando `estorno: null`) para garantir a robustez. Essa prática garante correctness e measurement, essenciais para as regras financeiras do projeto.
