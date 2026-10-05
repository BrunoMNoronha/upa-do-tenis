# Arquitetura do Sistema: UPA do Tênis

## Visão Geral

O projeto adota uma arquitetura full-stack moderna centralizada no **Next.js 14**, aproveitando o paradigma de **App Router** e **Server Components (RSC)**.

## Fluxo de Dados e Camadas

O modelo adotado minimiza a necessidade de APIs REST externas tradicionais, integrando o backend diretamente no framework através das **Server Actions** e **Route Handlers**.

### 1. Camada de Apresentação (Frontend)
- Construída com **React** e **Tailwind CSS**.
- **Client Components** (`"use client"`) são restritos a partes da interface que necessitam de interatividade (Formulários, Modais, State, Hooks).
- Os Formulários são validados utilizando **React Hook Form** + **Zod**, garantindo a sanidade dos dados antes do envio.

### 2. Camada de Lógica (Next.js Server / API)
- **Server Components**: Usados por padrão para listagens e páginas estáticas/dinâmicas. Fazem consultas ao banco de dados diretamente no momento da renderização do lado do servidor (SSR), o que garante velocidade e zero dependência no cliente.
- **Server Actions / Route Handlers (`src/app/api/...`)**: Onde ocorrem as mutações (POST/PUT/DELETE) e se concentra a regra de negócio antes da persistência.

### 3. Camada de Persistência (Prisma ORM)
- O **Prisma** atua como camada de mapeamento e abstração (`src/lib/prisma.ts`).
- Ele consome o `schema.prisma` e expõe métodos fortemente tipados baseados nos modelos de dados.
- Todo o ciclo de vida do banco (migrations, esquema) é controlado e versionado pela pasta `prisma/`.

### 4. Banco de Dados (PostgreSQL)
- A instância utilizada é um banco de dados relacional **PostgreSQL**, acessado via `DATABASE_URL`.
- Estruturado de forma relacional estrita (regras de chaves estrangeiras, deleção em cascata e restrições lógicas mantidas no motor relacional).

## Padrões Adotados
1.  **Separação de Componentes**: Diretório `src/components/` focado em UI isolada (botões, inputs, cards) ou complexa (Forms).
2.  **Validação Única (Single Source of Truth)**: O `zod` serve tanto como fonte de validação de interface quanto para inferir os tipos estáticos (ex: `z.infer<typeof schema>`).

## Cache seletivo de dados


`src/lib/dados-cache.ts` usa `unstable_cache` do Next.js 15, com proteção `server-only`, para serviços ativos, formas de pagamento operacionais, dados da empresa e link de avaliação Google. `CACHE_DADOS_ENABLED` precisa ser exatamente `true` para habilitar as leituras cacheadas; a ausência da variável ou `false` mantém consultas diretas. As funções Prisma originais continuam disponíveis para scripts, testes e regras de negócio.

Todas as leituras têm `revalidate: 300`. As chaves/tags usam versão `upa-dados-v1`, ambiente (`VERCEL_ENV`, com fallback para `NODE_ENV`) e SHA-256 do destino PostgreSQL (host, porta, banco e schema), sem credenciais. Destino ausente ou inválido desabilita o cache, preservando o tratamento de fallback institucional. Preços são strings e datas são ISO dentro do callback, garantindo o mesmo contrato no cache frio e quente. Somente valores persistidos de configuração entram no cache; interpretação, validação e fallback ficam fora.

| Recurso/tag (após o namespace) | Escritas que invalidam após persistência |
|---|---|
| `servicos` | POST, PATCH e DELETE de serviço |
| `formas-pagamento` | POST, PATCH e DELETE de forma de pagamento |
| `dados-empresa` | PUT dos dados institucionais |
| `link-avaliacao-google` | PUT do link, incluindo limpeza |

A invalidação independe da flag de leitura e ocorre somente após sucesso no banco, fora de transações. Falha de invalidação registra o recurso e preserva a resposta de sucesso da escrita confirmada. Scripts/alterações diretas no banco convergem pela revalidação temporal: 300 segundos não são um limite rígido de desatualização, pois a primeira leitura vencida pode devolver a entrada anterior enquanto a atualização ocorre em segundo plano; falhas nessa atualização podem manter a entrada anterior.

Dados de sessão, caixa, estoque, pagamentos, estados operacionais, clientes e estatísticas de OS não usam cache persistente. As opções de cadastro consultam clientes ativos a cada requisição e reutilizam apenas os serviços. Listagens de gestão permanecem diretas, inclusive `possuiMovimento` das formas de pagamento. Validações financeiras continuam consultando o banco atual dentro de suas transações. Páginas privadas mantêm `force-dynamic` e autorização antes das leituras; GETs privados envolvidos enviam `Cache-Control: private, no-store`, pois o cache é interno ao servidor.

Após salvar configurações, os formulários atualizam seu estado pela resposta e executam `router.refresh()`; o shell de Configurações recebe os dados institucionais no servidor. O cache nativo atende Vercel e uma instância standalone; múltiplas instâncias próprias exigem cache compartilhado e homologação específica. Cache Components pertence a uma migração futura para Next.js 16. Roteiro e evidência HTTP reproduzível: [ROTEIRO_CACHE_DADOS.md](../03-homologacao/roteiros/ROTEIRO_CACHE_DADOS.md).
