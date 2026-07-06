# Relatório Técnico — Fatia Segurança 01

Data: 2026-07-06
Marco: MVP — Primeira Etapa de Produção (pendência bloqueadora PEND-01)

## Objetivo

Implementar e validar o enforcement de autenticação server-side para páginas privadas e APIs críticas, garantindo que o sistema não exponha dados operacionais, financeiros, caixa, estoque, vendas ou relatórios sem sessão válida.

## Diagnóstico inicial

- Branch: `main`, limpa e sincronizada com `origin/main` (commit inicial `ae95734`).
- Estado do Git: sem arquivos pendentes antes da fatia.
- Stack identificada: Next.js 14.2.35 (App Router, diretório `src/app`), TypeScript 5.7, Prisma 5.22, Vitest 4.
- Estratégia atual de autenticação: cookie `upa_sessao` assinado com HMAC-SHA256 (`src/lib/auth-session.ts`), emitido por `/api/auth/login` com `httpOnly`, `sameSite: lax`, `secure` em produção e validade de 8h. Helpers `exigirSessao`/`obterUsuarioSessaoDaRequest` já existiam em `src/lib/auth-server.ts`.
- Rotas públicas: `/login`, `POST /api/auth/login`, `POST /api/auth/logout`.
- Rotas privadas: todas as demais páginas (`/`, `/dashboard`, `/clientes`, `/ordens-servico`, `/caixa`, `/vendas`, `/vendas-balcao`, `/produtos`, `/insumos`, `/servicos`, `/formas-pagamento`, `/relatorios/*`, `/usuarios`).
- APIs críticas identificadas: 28 handlers privados em 26 arquivos `route.ts` (caixa, pagamentos de OS, vendas, dashboard, relatórios, clientes, produtos, insumos, serviços, formas de pagamento, usuários).
- **Problema confirmado:** apenas `/usuarios` (página) e `/api/usuarios` exigiam sessão. Todas as outras APIs respondiam `200` com dados sensíveis sem cookie, e todas as páginas privadas renderizavam sem sessão.
- Não havia `middleware.ts`.
- Next 14.2.35 já contém a correção da CVE-2025-29927 (bypass de middleware via `x-middleware-subrequest`, corrigida em 14.2.25).

## Implementação realizada

Defesa em duas camadas, sem alteração de schema, regra financeira ou dependência nova:

1. **Middleware central (`src/middleware.ts`)** — todas as requisições, exceto assets estáticos, passam por validação de token no Edge runtime:
   - página privada sem token válido → redirect `307` para `/login`;
   - API privada sem token válido → `401 { "message": "Não autenticado." }`;
   - rotas públicas em allowlist explícita; **rotas novas são privadas por padrão**.
2. **Enforcement por handler** — novo helper `exigirSessaoApi(req)` em `src/lib/auth-server.ts` aplicado como primeira instrução de todos os 28 handlers privados. Além da assinatura do token, confirma no banco que o usuário existe e está **ativo** (mesmo padrão já homologado em `/api/usuarios`). Protege mesmo em cenário de bypass do middleware.
3. **Suporte Edge** — o Edge runtime não expõe `node:crypto`; criado `src/lib/auth-edge.ts` (verificação HMAC via Web Crypto) e `src/lib/auth-constants.ts` (cookie, duração e segredo compartilhados entre os dois runtimes). `auth-session.ts` passou a reexportar as constantes — nenhum import existente quebrou e a lógica de assinatura não mudou.
4. Rota `/api/relatorios/estoque/alertas` marcada `force-dynamic` (antes era pré-renderizada estaticamente no build; incompatível com leitura de cookie).
5. Documentação da regra criada em `docs/00-base-conhecimento/AUTENTICACAO.md`.

Cookies validados: `httpOnly` ✔, `sameSite: lax` ✔, `secure` em produção ✔, expiração 8h ✔, segredo apenas server-side (`AUTH_SESSION_SECRET`, obrigatório em produção; nenhum uso de `NEXT_PUBLIC_*`) ✔ — já estavam corretos, sem alteração.

## Arquivos alterados

Novos:
- `src/middleware.ts`
- `src/lib/auth-constants.ts`
- `src/lib/auth-edge.ts`
- `src/middleware.test.ts`
- `src/lib/auth-edge.test.ts`
- `src/__tests__/api-auth-enforcement.test.ts`
- `docs/00-base-conhecimento/AUTENTICACAO.md`
- este relatório

Modificados:
- `src/lib/auth-session.ts` (constantes movidas para `auth-constants.ts`, reexportadas)
- `src/lib/auth-server.ts` (novo helper `exigirSessaoApi`)
- 22 arquivos `route.ts` sob `src/app/api/` (caixa ×5, ordens-servico ×5, clientes ×2, servicos ×2, insumos ×3, relatorios ×3, dashboard, formas-pagamento, produtos ×2, vendas ×2) — somente inclusão do check de sessão; nenhuma regra de negócio alterada
- `src/app/api/vendas/vendas-api.test.ts` e `src/app/api/produtos/[id]/produtos-delete.test.ts` (simulam requisição autenticada; nenhum cenário removido)

## Testes criados ou ajustados

- `src/__tests__/api-auth-enforcement.test.ts` — **34 casos**: cada handler privado responde `401` sem cookie e **sem tocar o banco** (proxy sobre o Prisma falha o teste se acessado).
- `src/middleware.test.ts` — redirect de página privada para `/login`, `401` em APIs privadas (inclusive token adulterado), passagem com sessão válida e rotas públicas acessíveis.
- `src/lib/auth-edge.test.ts` — verificador Edge aceita token assinado pelo Node, rejeita adulterado/expirado/malformado.
- Ajuste dos 2 testes de API existentes para simular sessão (mock do helper), preservando todos os cenários de negócio.

## Comandos executados

| Comando | Resultado |
|---|---|
| `git status -sb` / `git diff --stat` | branch `main` limpa antes da fatia |
| `npm run lint` | ✔ sem erros ou warnings |
| `npm run test` | ✔ 323 testes aprovados (32 arquivos) |
| `npm run build` | ✔ build de produção limpo; middleware compilado para Edge (27,1 kB) |

Observação: a primeira execução do build falhou por erro de tipagem (`Uint8Array` genérico do TS 5.7 em `auth-edge.ts`); corrigido com anotação `Uint8Array<ArrayBuffer>` e o build passou.

## Evidências técnicas

Verificação executada contra o servidor local (`next dev`, porta 3000):

- APIs privadas sem sessão → **`401 { "message": "Não autenticado." }`** em `/api/dashboard`, `/api/caixa`, `/api/caixa/atual`, `/api/clientes`, `/api/ordens-servico/[id]`, `/api/relatorios/financeiro-os`, `/api/vendas`, `/api/usuarios`.
- Páginas privadas sem sessão → redirect para `/login` (verificado em `/dashboard` e `/caixa`; navegação termina em `/login` renderizada, sem erros de console).
- Login/logout → `/login` responde `200` sem sessão; `POST /api/auth/login` com credenciais inválidas responde `401` com a mensagem própria (não é bloqueado pelo middleware); `POST /api/auth/logout` responde `200` e expira o cookie.
- Acesso autenticado → com cookie de sessão válido de usuário ativo: `/api/caixa/atual`, `/api/dashboard`, `/api/clientes` e página `/dashboard` respondem `200`; após logout, a mesma API volta a responder `401`.

## Riscos remanescentes

1. **Revogação imediata de sessão**: o middleware valida assinatura/expiração sem consultar o banco; um usuário inativado mantém acesso a **páginas** até o token expirar (máx. 8h). As **APIs** (onde estão os dados) já bloqueiam usuário inativo imediatamente via `exigirSessaoApi`. Aceito para esta fatia.
2. **Páginas com dados server-rendered** dependem exclusivamente do middleware (exceto `/usuarios`). Mitigado pela versão do Next já corrigida contra o bypass conhecido e pelo bloqueio em nível de API. Reforço página a página pode ser feito em fatia futura sem risco.
3. **Sem RBAC**: qualquer usuário ativo acessa tudo — escopo explícito de fatia futura.
4. `AUTH_SESSION_SECRET` precisa estar definido no ambiente de produção (o servidor recusa iniciar sessões sem ele) — item de preparação de ambiente.

## Pendências

- Homologação manual pelo Bruno (roteiro abaixo).
- Definição de `AUTH_SESSION_SECRET` forte no ambiente de produção (etapa de preparação de deploy).

## Roteiro de homologação

1. Em aba anônima (sem cookies), acessar `http://localhost:3000/dashboard` → deve redirecionar para `/login`.
2. Ainda sem sessão, abrir direto no navegador: `/api/dashboard`, `/api/caixa`, `/api/clientes`, `/api/vendas`, `/api/relatorios/financeiro-os` → todas devem responder `401 { "message": "Não autenticado." }`, sem dados.
3. Fazer login com usuário válido → deve entrar normalmente.
4. Navegar por dashboard, clientes, OS, financeiro/pagamentos, caixa, estoque/insumos, vendas e relatórios → tudo deve funcionar como antes (nenhuma regra de negócio mudou).
5. Executar um fluxo mínimo: criar cliente → criar OS → registrar pagamento → movimentar caixa → registrar venda → conferir dashboard/relatório.
6. Abrir DevTools e confirmar ausência de erros de console nos fluxos principais.
7. Fazer logout → tentar `/caixa` de novo → deve voltar para `/login`.
8. Limpar cookies manualmente e repetir o passo 1.

## Veredito

[x] Aprovado tecnicamente
[ ] Aprovado com ressalvas
[ ] Reprovado

Todos os critérios de aceite atendidos: APIs privadas respondem `401` sem sessão, páginas privadas redirecionam, rotas públicas preservadas, lint/testes/build aprovados, nenhuma regra financeira/estoque/caixa alterada.

## Próximo passo recomendado

1. Homologação manual pelo Bruno com o roteiro acima.
2. Após aprovação: commit da fatia e seguir para preparação do ambiente produtivo (definir `AUTH_SESSION_SECRET`, banco de produção, `NODE_ENV=production`) — o deploy segue bloqueado até a homologação manual desta fatia.
