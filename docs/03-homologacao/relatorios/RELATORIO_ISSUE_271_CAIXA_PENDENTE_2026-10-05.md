# Issue #271 — encaminhamento ao fechamento de caixa pendente

Data: 05/10/2026. Issue: <https://github.com/BrunoMNoronha/upa-do-tenis/issues/271>.
Branch local: `codex/issue-271-fechamento-caixa`.
Base: `76a0887e1232b6ec7e89ad48ec65a73eefe601b5`.

## Implementação

- Todas as páginas privadas que chamam `exigirSessao()` verificam a pendência
  depois da autenticação. Caixa aberto em data operacional anterior encaminha
  para `/caixa`, inclusive após login e em URL administrativa direta.
- A única exceção é a página `/caixa`, que exige sessão e permite realizar a
  conferência. Histórico e detalhes de caixas continuam sujeitos à verificação.
- A classificação existente usa a data civil de `America/Sao_Paulo`; não há
  regra nova de 24 horas, dia útil ou horário de expediente.
- `/api/caixa/atual` preserva o campo `caixa` e acrescenta `alerta`, calculado
  sobre a mesma leitura. Isso fornece a classificação do relógio do servidor
  à interface sem uma segunda consulta potencialmente divergente.
- O caixa pendente mostra data/hora e abre o formulário automaticamente. O
  formulário aparece antes do resumo no modo pendente, inclusive em mobile.
  A grade usa colunas com mínimo zero para não cortar o conteúdo estreito.
- Antes do POST de fechamento, a interface reconsulta o caixa atual. Um id
  diferente impede o envio; o saldo conferido nunca é enviado ao próximo caixa.
  O POST continua destinado ao id capturado pelo operador, mesmo numa corrida.
- Depois do fechamento ou de uma tentativa com erro, a tela reconsulta o estado.
  Uma mudança de id limpa a conferência anterior. O retorno à aba também
  reconsulta, e respostas anteriores não substituem uma leitura mais recente.
- Falhas de leitura apresentam nova tentativa. A boundary de páginas mantém a
  possibilidade de sair e não mostra detalhes internos do erro.

Nenhuma regra de saldo, divergência, movimentação, pagamento ou estoque foi
alterada. Não houve alteração de schema, migration, dependência ou lockfile.
O redirecionamento não constitui bloqueio financeiro de APIs ou de abas que já
estavam abertas. O fechamento continua exigindo saldo informado e confirmação.

## Arquivos desta tarefa

- `src/lib/auth-server.ts` e `src/lib/auth-server.test.ts`.
- `src/app/caixa/page.tsx` e `src/app/caixa/caixa-client.tsx`.
- `src/app/api/caixa/atual/route.ts` e `atual-api.test.ts` na mesma pasta.
- `src/lib/caixa-fechamento-client.ts` e `caixa-fechamento-client.test.ts`.
- `src/app/error.tsx` e `src/app/paginas-privadas.test.ts`.
- `scripts/homologar-caixa-pendente.ts` — fixture com bloqueio explícito de alvo.
- `docs/00-base-conhecimento/AUTENTICACAO.md` e este relatório.

As mudanças preexistentes em `docs/04-producao/PLANO_BACKUP_RESTORE.md` e o
arquivo `RELATORIO_BACKUP_NEON_2026-10-04.md` foram preservados.

## Validação técnica

| Comando | Resultado |
| --- | --- |
| `git diff --check` | Aprovado |
| `pnpm run lint` | Aprovado, sem erro ou warning do código |
| `pnpm run typecheck` | Aprovado |
| `pnpm exec vitest run src/lib/auth-server.test.ts src/lib/caixa-fechamento-client.test.ts src/app/api/caixa/atual/atual-api.test.ts src/app/paginas-privadas.test.ts src/lib/caixa-alerta.test.ts` | Windows: 5 arquivos, 85 testes aprovados |
| `pnpm run test` | Linux isolado: 139 arquivos, 1.478 testes aprovados; 159,82 s |
| `pnpm run build` | Aprovado no Windows, com geração do Prisma Client e build Next.js 15.5.25 |

A suíte completa foi executada numa cópia local do código, em container
`node:24.19.0-bookworm-slim`, pnpm 11.25.0 e PostgreSQL 16, com OpenSSL instalado.
O hash SHA-256 de `caixa-client.tsx` foi comparado entre checkout e cópia:
`f6ddff3db4d5c8d422c3f3a92c819dd73174becde62d7ddcc67b3f2a99ec4598`.
O log bruto local fica em `backups/issue271/linux-tests.log`, ignorado pelo Git.

No Windows, a primeira suíte completa teve 1.470 testes aprovados e oito falhas.
Sete falhas eram `P2028` ao iniciar transações concorrentes; um script mínimo de
duas transações, independente do código alterado, reproduziu a falha. O problema
persistiu com PostgreSQL 16 e pool explícito. A oitava falha, de classificação
de erro de FK em PostgreSQL 18, passou com PostgreSQL 16. A execução Linux com
PostgreSQL 16 aprovou todas as regressões, sem modificar cálculos ou testes para
contornar essas falhas. A causa completa da limitação Windows não foi fechada.

Avisos de ferramentas existentes: configuração global `globalShims` ignorada
pelo pnpm atual, depreciação de `next lint` e aviso de `__dirname` do Vitest/Vite.

## Homologação local e evidências

Ambiente sintético independente em `localhost:55440/upa_do_tenis_issue271`,
servido em `http://localhost:3107`, primeiro em desenvolvimento e depois pelo
build aprovado com `pnpm run start --port 3107`. Nenhum banco de produção ou
Preview foi acessado. Somente migrations já versionadas foram aplicadas aos
bancos novos de validação.

Confirmado em navegador com agent-browser:

1. Login com caixa aberto no dia anterior encaminhou `/dashboard` → `/caixa`.
2. URL direta `/clientes` também encaminhou para `/caixa`, sem loop.
3. Aviso de pendência, data/hora e formulário aberto foram apresentados.
4. Saldo inicial de R$ 100,00 + entrada sintética de R$ 20,00; confirmação com
   R$ 110,00 gravou `FECHADO`, calculado R$ 120,00 e divergência −R$ 10,00.
5. Após fechar, `/dashboard` voltou a abrir normalmente, sem redirecionamento.
6. Caixa de hoje permitiu `/clientes`; `/caixa` mostrou **Iniciar Fechamento**.
7. Interrupção da consulta de caixa apresentou erro com **Tentar novamente**;
   retirar a interrupção e tentar novamente recuperou a tela.
8. A versão compilada foi inspecionada em 390 × 844 px: aviso e formulário sem
   corte horizontal; campo com largura de 308 px, entre x=41 e x=349. A largura
   total da página permaneceu em 390 px. Captura local: `issue271-mobile.png`.
9. Caixa anterior substituído por um caixa de hoje enquanto a tela antiga
   permanecia aberta: a confirmação foi recusada; o novo caixa permaneceu
   `ABERTO`, sem saldo final gravado. A tela retirou a pendência e mostrou
   **Iniciar Fechamento**; ao abrir o formulário, o campo de saldo estava vazio.
10. Sem caixa aberto, a URL `/clientes` permaneceu acessível, sem redirecionar.
11. Caixa aberto quatro dias antes encaminhou `/` para `/caixa`. A versão
    compilada foi inspecionada em 1440 × 1000 px, com aviso, formulário e resumo
    visíveis, sem corte. Captura local: `issue271-desktop.png`.
12. **Sair** funcionou durante a pendência e retornou ao login. Depois do logout,
    `/clientes` exigiu login. `/acompanhar/teste271` permaneceu público e mostrou
    a resposta genérica de link indisponível, sem redirecionar ao caixa.

As capturas e o log estão em `backups/issue271/`, ignorado pelo Git. A recusa de
fechar um caixa substituído foi verificada mantendo a tela antiga aberta e
mudando a fixture; o teste não usou dois operadores reais simultaneamente.

Testes automatizados cobrem ausência de caixa, vários dias, meia-noite
operacional/UTC, exceção do fechamento, falha de consulta, sessão inválida,
remoção da pendência após outra sessão fechar e recusa de enviar conferência
para um caixa substituído. As regressões financeiras fazem parte da suíte total.

## Roteiro reproduzível e limites

Usar exclusivamente a base sintética local. A fixture recusa qualquer destino
diferente de `localhost:55440/upa_do_tenis_issue271`. Com `DATABASE_URL` apontando
para ela, executar `pnpm exec tsx scripts/homologar-caixa-pendente.ts pendente`,
`hoje`, `antigo`, `sem-caixa` ou `estado`, conforme o cenário. A fixture prepara
um operador de teste, dinheiro e um caixa com saldo físico esperado de R$ 120,00.

- Fazer login; verificar destino e repetir com URL privada direta e reload.
- Em 390 px, conferir data/hora e todos os campos/botões sem corte horizontal.
- Informar saldo físico, confirmar e verificar totais persistidos e histórico.
- Repetir sem caixa, com caixa de hoje e de vários dias.
- Em outra sessão, fechar/substituir o caixa antes de confirmar a tela antiga;
  conferir que a tentativa não fecha o novo caixa nem reutiliza o saldo digitado.
- Simular falha de leitura/fechamento; retomar e confirmar logout disponível.

Ao concluir, o servidor e os containers dedicados `upa-issue271-test`,
`upa-issue271-pg16` e `upa-issue271-linux` foram parados. As bases sintéticas e
os logs foram preservados para reprodução; nenhum recurso de outro projeto
foi alterado. O arquivo local ignorado `.env.test` contém somente configuração
dos testes isolados e precisa do PostgreSQL de validação ativo para nova execução.

Este relatório registra as evidências da implementação antes da integração.
A publicação e o merge são acompanhados separadamente na PR da issue #271,
após o comando `techlab-merge` do usuário. Homologação institucional em
Preview/produção e eventual nova regra para impedir operações diretas nas APIs
continuam fora desta entrega. A configuração versionada da Vercel permite
deployment automático da `main`; isso não comprova que a revisão foi publicada
ou homologada nesse ambiente.
