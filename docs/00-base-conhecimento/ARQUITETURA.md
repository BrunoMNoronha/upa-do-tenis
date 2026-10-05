# Arquitetura do sistema: UPA do Tênis

## Base técnica

O sistema é um monólito modular em Next.js 15 (App Router), React 18, TypeScript, Prisma 5 e PostgreSQL. As rotas de página usam Server Components para autorização e leitura inicial. Componentes cliente cuidam de formulários, filtros, diálogos, ações e atualização da interface. Tailwind CSS 3 compõe a apresentação.

O gerenciador de pacotes é exclusivamente `pnpm`. O schema e as migrations são versionados em `prisma/`.

## Autorização e dados

O middleware faz a primeira verificação do token nas rotas privadas. Cada página privada também chama `exigirSessao()` antes de consultar dados; os Route Handlers aplicam `exigirSessaoApi()`. A página de caixa preserva a exceção necessária para fechar um caixa pendente. A verificação do middleware não substitui a autorização no servidor.

As leituras e operações de negócio ficam em `src/lib/`. Route Handlers em `src/app/api/` oferecem os contratos HTTP usados pelos componentes cliente e por integrações existentes. Mutações financeiras, de estoque e de caixa continuam nos serviços com as transações e validações próprias. Formulários usam React Hook Form e Zod; o servidor valida novamente antes de persistir.

## Renderização das ordens de serviço

- A listagem é paginada e filtrada no banco. A página usa uma projeção específica para os cards; pagamentos e valores necessários ao cálculo financeiro são processados no servidor e não integram o DTO enviado à interface. O contrato da API geral de OS continua separado.
- O shell da listagem é renderizado antes de aguardar os dados dos cards. Suspense e os arquivos `loading.tsx` exibem um estado de carregamento durante consultas e navegação.
- O detalhe recebe os dados da OS na renderização inicial, usando o mesmo montador de DTO do GET correspondente. Releituras após mutações continuam via API, com tratamento de erros e descarte de respostas antigas.
- O formulário de nova OS é um módulo cliente carregado quando o drawer abre. Suas opções vêm de `GET /api/ordens-servico/opcoes-cadastro`, que exige sessão, retorna clientes ativos e serviços em formato mínimo e envia `Cache-Control: private, no-store`.
- A identidade institucional das páginas de OS é lida no servidor e passada ao shell e à lista. Outras páginas mantêm o carregamento já existente no shell.

## Política de frescor e evolução

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

Melhorias de concorrência em insumos e abertura de caixa, índices e agregações de relatórios exigem testes e homologação próprias. Não fazem parte da otimização de navegação das OS.
