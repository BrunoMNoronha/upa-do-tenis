# PENDENCIAS

## Dúvidas de negócio para validação futura

- `valorTotal` da OS será informado manualmente no cadastro ou calculado a partir dos itens e serviços?
- `saldo` será persistido apenas como espelho calculado ou será recalculado sempre na leitura?
- `dataConclusao` representa a finalização do serviço ou o momento de entrega física?
- A OS poderá ser criada sem itens em rascunho, ou o cadastro mínimo exige ao menos um item já na abertura?
- O campo `cpfCnpj` deve aceitar apenas um documento por vez ou separar CPF e CNPJ em versões futuras?

## Pendências técnicas / segurança

Registradas na Revisão Final do MVP pós-Fatia 13.4 (2026-07-06). Fonte: `docs/03-homologacao/relatorios/RELATORIO_REVISAO_FINAL_MVP_2026-07-06.md`.

### PEND-01 — Ausência de enforcement de autenticação server-side fora da área de Usuários

- **Severidade:** Alta.
- **Prioridade:** Alta antes de produção.
- **Natureza:** Pré-existente — não é regressão introduzida pela Fatia 13.4.
- **Status:** Aberta (não tratada nesta etapa, por decisão de escopo).
- **Descrição:** Não há `middleware.ts`. A verificação de sessão (`exigirSessao` / `obterUsuarioSessaoDaRequest`) está aplicada apenas em `src/app/usuarios/page.tsx`, `src/app/api/usuarios/route.ts` e `src/app/api/usuarios/[id]/route.ts`. As demais páginas renderizam sem sessão e o `AppShell` não faz guarda de autenticação (apenas trata logout).
- **Evidência:** Sem cookie de sessão, retornaram HTTP 200: `/api/dashboard`, `/api/caixa/atual`, `/api/clientes`, `/api/relatorios/financeiro-os`, `/api/vendas`.
- **Recomendação:** Tratar em **fatia dedicada de segurança** (ex.: `middleware.ts` cobrindo rotas privadas + verificação de sessão nas APIs sensíveis, com testes de autorização). **Não acoplar à Fatia 13.5.**

### PEND-02 — Inconsistência de método GET em rotas de API (observação de baixa prioridade)

- **Severidade:** Baixa.
- **Prioridade:** Baixa.
- **Status:** Observação.
- **Descrição:** GET direto a `/api/servicos`, `/api/produtos`, `/api/insumos` e `/api/ordens-servico` retorna HTTP 405, enquanto `/api/clientes`, `/api/dashboard`, `/api/caixa/atual` e `/api/vendas` retornam 200. As telas correspondentes funcionam normalmente (listagens via renderização no servidor); **sem impacto funcional**.
- **Recomendação:** Padronizar a exposição de métodos por rota quando conveniente; sem urgência.
