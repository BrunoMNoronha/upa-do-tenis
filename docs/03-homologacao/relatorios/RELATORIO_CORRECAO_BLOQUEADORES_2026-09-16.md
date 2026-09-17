# Correção técnica dos bloqueadores — 16/09/2026

Esta entrega não aprova a homologação. As alterações permanecem locais para revisão.

## 1. Diagnóstico inicial

- Branch: `main`.
- Commit: `620106ccd140ba0e9503fcfb32df7fe35131d7f7`.
- `git fetch --prune` concluído; `main` sincronizada com `origin/main`.
- Working tree inicialmente limpo, sem alterações locais.
- Node `24.19.0`, pnpm `11.25.0`, Prisma `5.22.0`, Next `15.5.25`.
- Baseline: 1.177 testes passando em 109 arquivos. A suíte inicial não detectava a ausência da tabela na consulta real de detalhe.
- Banco de desenvolvimento: `localhost:5434/upa_do_tenis_dev`.
- Banco de testes: `localhost:5434/upa_do_tenis_test`, separado do desenvolvimento. A configuração Vitest força o destino de `.env.test`.
- Nenhuma alteração em arquivos foi feita antes do diagnóstico Git, schema, migrations, consultas, configuração, histórico e caminhos de interface.

## 2. Causa raiz do P0

1. `FotoItemOrdem` existe em `prisma/schema.prisma`, relacionada a `ItemOrdemServico.fotos`.
2. Existe migration versionada criando a tabela.
3. A migration é `20260916210000_add_galeria_fotos_item_os`, introduzida pelo commit `620106c` (PR #216).
4. Ela não constava em `_prisma_migrations` em nenhum dos dois bancos locais; as nove anteriores estavam aplicadas.
5. `to_regclass('public."FotoItemOrdem"')` retornava `NULL` no desenvolvimento. A consulta com `itens.fotos` reproduziu Prisma `P2021`, tabela `public.FotoItemOrdem`.
6. Portanto, o problema era migration existente **não aplicada**, e não model incorreto ou necessidade de migration nova.

`obterDetalheOrdemServico()` inclui a relação `fotos` mesmo para itens sem foto. A ausência da tabela falhava antes de montar a resposta, e o GET retornava HTTP 500. Isso bloqueava o carregamento do detalhe e o acesso ao pagamento.

O código da galeria chegou ao checkout, mas sua migration não chegou ao banco. O script `dev` somente inicia o Next; `postinstall` gera o client e a suíte não migra o banco. O README ainda orientava `db push`, sem orientar a reaplicação de migrations após atualizar o código. Esses fatos demonstram a lacuna do processo local; não há evidência para atribuir a omissão a uma pessoa ou comando histórico específico.

## 3. Banco/migration

- `schema.prisma`: sem edição.
- Migration nova: nenhuma.
- Migration existente aplicada: `20260916210000_add_galeria_fotos_item_os`, exclusivamente nos bancos locais de desenvolvimento e testes.
- Nenhum `db push`, reset, seed ou criação manual de tabela foi executado.
- SQL revisado e causa/impacto/risco apresentados antes da aplicação.
- Não havia caminhos legados duplicados no desenvolvimento, condição que poderia interromper o backfill.
- Depois da aplicação: Prisma aponta desenvolvimento atualizado e `migrate diff` entre banco e schema retorna `No difference detected`.

SQL executado: conteúdo integral, sem alteração, de `prisma/migrations/20260916210000_add_galeria_fotos_item_os/migration.sql`. Ele executa:

```sql
CREATE TABLE "FotoItemOrdem" (
    "id" TEXT NOT NULL,
    "itemOrdemServicoId" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoItemOrdem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FotoItemOrdem_pathname_key" ON "FotoItemOrdem"("pathname");
CREATE INDEX "FotoItemOrdem_itemOrdemServicoId_criadoEm_idx"
    ON "FotoItemOrdem"("itemOrdemServicoId", "criadoEm");
ALTER TABLE "FotoItemOrdem"
    ADD CONSTRAINT "FotoItemOrdem_itemOrdemServicoId_fkey"
    FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "ItemOrdemServico"
        WHERE "fotoRecebimentoPathname" IS NOT NULL
        GROUP BY "fotoRecebimentoPathname" HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Backfill interrompido: fotoRecebimentoPathname duplicado entre itens.';
    END IF;
END $$;
INSERT INTO "FotoItemOrdem" ("id", "itemOrdemServicoId", "pathname", "criadoEm")
SELECT 'legacy_' || md5(item."id" || ':' || item."fotoRecebimentoPathname"),
    item."id", item."fotoRecebimentoPathname", item."criadoEm"
FROM "ItemOrdemServico" AS item
WHERE item."fotoRecebimentoPathname" IS NOT NULL
ON CONFLICT ("pathname") DO NOTHING;
```

O efeito estrutural é aditivo: tabela, índices, FK e cópia das referências legadas. Nenhuma tabela financeira ou regra de cálculo foi modificada.

## 4. Erro Decimal

`listarServicos()` devolvia registros Prisma diretamente para a prop `servicos` de `OrdensServicoClient`, em `src/app/ordens-servico/page.tsx`. `precoBase` ainda era uma instância de `Prisma.Decimal` na fronteira Server Component → Client Component.

A página agora envia somente `id`, `nome` e `precoBase.toString()`. A string conserva as casas decimais, e a conversão numérica já existente no formulário permanece intacta. Não houve substituição global de Decimal, alteração da camada de banco ou das funções financeiras.

## 5. Lista desatualizada

No cadastro de OS, `router.refresh()` só era executado em `concluirCriacao()`, depois de todos os uploads. Se a OS fosse persistida e uma foto falhasse, o fluxo retornava com `ordemPendenteFoto` e não atualizava a lista. O banco sem a tabela de fotos tornava esse caminho especialmente relevante.

O refresh foi movido para logo após a resposta de criação bem-sucedida e leitura do JSON, antes dos uploads. Assim, não depende das fotos. O reenvio e a proteção contra recriar a OS permanecem. Cache global, filtros, ordenação e paginação não foram alterados.

Clientes e serviços já chamam refresh após salvar. Não foi demonstrado outro defeito nessas listagens, e elas não foram alteradas. Uma nova OS que não corresponde ao filtro atual, ou que pertence a outra página pela ordenação vigente, continua fora da página atual por regra existente.

## 6. Arquivos alterados

- `README.md`: processo de aplicação das migrations locais, substituindo a orientação de `db push`.
- `src/app/ordens-servico/page.tsx`: serialização do catálogo na fronteira cliente.
- `src/app/ordens-servico/ordens-servico-client.tsx`: atualização da lista após persistir a OS, independente do upload.
- `src/app/ordens-servico/page-serializacao.test.ts`: novo teste da fronteira de serialização.
- `src/lib/homologacao-bloqueadores.test.ts`: novas regressões integradas com banco real.
- Este relatório.

## 7. Testes adicionados/alterados

Cinco testes novos:

- Página entrega catálogo serializável, preservando `1234567890.123456789` como string exata.
- Detalhe retorna HTTP 200 sem fotos, com uma foto e com três fotos; dados opcionais ausentes não provocam erro.
- Nos cenários com fotos, a rota de imagem consulta o vínculo real e devolve o stream, tipo e cache privado. Apenas o serviço externo Blob é simulado.
- Criação pela API real, detalhe, pagamento parcial de R$ 40, saldo de R$ 60, pagamento restante de R$ 60, saldo zero, caixa com duas entradas somando R$ 100 e relatório coerente em ambas as etapas.
- O mesmo teste financeiro rejeita pagamento adicional acima do saldo, mantém dois pagamentos e dois vínculos distintos de caixa, sem valores negativos.

As rotas são chamadas com `NextRequest`, banco e transações reais, simulando somente a sessão e o storage externo. Dados criados pelos novos testes são removidos por seus próprios identificadores. Os testes existentes não foram enfraquecidos.

Na primeira execução dos testes novos, quatro falharam por mock de sessão incompleto (`obterUsuarioSessaoDaRequest`). O mock foi completado; a execução focada passou e a suíte integral posterior também.

## 8. Comandos executados e resultados

| Verificação | Resultado |
| --- | --- |
| `git status`, `git branch --show-current`, `git rev-parse HEAD`, `git fetch --prune`, `git status`, `git diff --stat` | Baseline limpo e sincronizado |
| Inspeção do schema, migrations, histórico Git, APIs, componentes, testes e configuração local | Causa identificada antes das alterações |
| `pnpm exec prisma migrate status` | Inicialmente uma migration pendente; desenvolvimento atualizado após aplicação |
| Consultas Prisma somente leitura: histórico, existência da tabela, duplicidades e detalhe | Ausência/P2021 reproduzidos antes da correção |
| `pnpm exec prisma migrate deploy` | Aplicou apenas a migration da galeria no desenvolvimento |
| Prisma CLI `migrate deploy` via Node com `--env-file=.env.test` | Aplicou a mesma migration no banco de testes; destino confirmado no output |
| `pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` | Sem divergência no desenvolvimento |
| `pnpm run lint` | Sucesso, sem erros ou warnings do ESLint |
| `pnpm run test` | **1.182 testes passaram em 111 arquivos** |
| `pnpm run typecheck` | Sucesso |
| `pnpm run build` | Sucesso em cópia isolada, com código de aplicação corrigido |
| HTTP autenticado, somente leitura, no servidor local: API de detalhe, página de listagem e página de detalhe | **200** nas três respostas; sem aviso de Decimal nas respostas inspecionadas |
| `git diff --check`, status e revisão do diff | Sem erros de whitespace; alterações locais para revisão |

Build isolado em `%TEMP%/upa-bloqueadores-build-20260916`, com dependências próprias instaladas por `pnpm install --offline --frozen-lockfile`, preservando o `.next` do servidor de desenvolvimento ativo. Sem env de produção. O build registrou fallback seguro de dados da empresa por falta de configuração de banco nessa cópia; compilação, tipos, geração e conclusão passaram.

Avisos de ferramentas preservados: configuração global pnpm `globalShims` ignorada, depreciação de `next lint` e aviso do Vite sobre futura mudança de config loader. Não foram feitas atualizações de dependências para ocultá-los.

## 9. Impacto em áreas críticas

| Área | Mudança de regra? | Evidência |
| --- | --- | --- |
| Pagamentos | Não | Parcial, restante e rejeição de excedente testados |
| Saldo | Não | 100 → 60 → 0 no teste integrado |
| Caixa | Não | Duas movimentações PAGAMENTO_OS, total 100, saldo físico 100 |
| Relatório financeiro | Não | Pago/saldo correspondem às duas etapas |
| Schema versionado | Não | `schema.prisma` e migrations sem alterações |
| Estrutura dos bancos locais | Sim, alinhamento à migration existente | Tabela da galeria agora presente |

A OS da homologação no desenvolvimento permanece com total R$ 100,00, pago R$ 0,00, saldo R$ 100,00 e nenhum pagamento. Não houve escrita financeira no banco de desenvolvimento.

## 10. Riscos remanescentes

- `BLOB_READ_WRITE_TOKEN` não está configurado no ambiente local. Upload e visualização de arquivo real no storage externo não foram validados e dependem da configuração autorizada de um storage de teste. A tabela ausente foi corrigida; a configuração do Blob é uma dependência separada.
- A navegação por navegador chegou à tela de login, sem sessão disponível. A verificação HTTP autenticada e os testes de rotas não equivalem à homologação manual completa da interface.
- A correção de refresh foi revisada no fluxo, mas a interação visual com upload malsucedido ainda precisa da re-homologação abaixo.
- A suíte não garante sozinha que todo banco esteja migrado; execute o preflight documentado antes de iniciar a aplicação após atualizar o código.
- Nenhuma alteração em produção, commit, push, PR, merge ou deploy foi realizada.

## 11. Roteiro de re-homologação

1. Confirmar destino local e `prisma migrate status` atualizado; iniciar a aplicação e entrar normalmente.
2. Abrir a OS da homologação sem fotos e confirmar detalhe carregado, total 100, pago 0, saldo 100.
3. Com storage de teste configurado, criar OS com zero, uma e múltiplas fotos; abrir as imagens e conferir ausência de erro 500, inclusive sem dados opcionais.
4. Criar OS sem fotos e conferir a lista/contadores sem recarregar manualmente, usando filtros que incluam a OS e a página adequada.
5. Simular falha de upload após criação: conferir atualização da lista, mensagem de erro, opção de reenvio e ausência de OS duplicada. Reenviar a foto.
6. Abrir caixa, registrar pagamento parcial de 40 e conferir pago 40/saldo 60 no detalhe e relatório.
7. Registrar restante de 60, conferir pago 100/saldo 0 e status financeiro pago.
8. Conferir exatamente duas entradas de caixa, com os pagamentos correspondentes, soma 100 e efeito no saldo físico conforme o tipo de forma de pagamento utilizado.
9. Tentar pagamento acima do saldo e confirmar rejeição sem novo pagamento/movimento.
10. Revisitar clientes, tramitação da OS, acompanhamento público sem sessão e relatório para confirmar os comportamentos previamente exercitados.

A decisão de aprovar ou reprovar a nova homologação permanece pendente da execução manual deste roteiro.
