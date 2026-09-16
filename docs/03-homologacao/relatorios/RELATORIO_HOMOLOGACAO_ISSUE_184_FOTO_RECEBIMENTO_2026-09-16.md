# Relatório de homologação — issue #184

Data: 16/09/2026  
Escopo: foto opcional e segura no recebimento de item de ordem de serviço  
Parecer: **APTO COM RESSALVAS**

## Entrega

- Campo opcional no item da OS e migration aditiva.
- Upload privado JPEG, PNG ou WebP com limite de 4 MB e validação de assinatura binária.
- Leitura autenticada, sem exposição do pathname privado.
- Substituição e remoção com proteção contra concorrência.
- Cadastro de OS com prévia da imagem e reenvio sem duplicar a OS quando somente o upload falha.
- Detalhe da OS com visualização; edição apenas no estado `ABERTA`.
- Store privado `upa-do-tenis-blob` provisionado na região de São Paulo e conectado a Production e Preview por OIDC.

## Evidências locais

- TypeScript: `pnpm run typecheck` — aprovado.
- Testes focados (API, autenticação e contrato do detalhe): 3 arquivos / 64 testes — aprovados.
- Lint: `pnpm run lint` — aprovado, sem avisos ou erros do código.
- Suíte completa: 89 arquivos / 947 testes — aprovados.
- Build de produção: `pnpm run build` — aprovado, incluindo a nova rota dinâmica da foto.
- Verificação visual anterior à reconstrução isolada: prévia no cadastro, estado vazio/exibição no detalhe e modo somente leitura fora de `ABERTA` — aprovados.

## Ressalvas

- Nenhum deploy foi executado.
- A migration não foi aplicada em produção.
- O envio real para Blob por OIDC precisa ser comprovado em Preview, pois a execução local não recebe o token OIDC do runtime Vercel.
- A captura por câmera ainda precisa de homologação em aparelho móvel.
- A política de backup/retenção do Blob e a reconciliação periódica de objetos órfãos precisam ser definidas operacionalmente.

## Roteiro de homologação

Seguir `docs/04-producao/FOTO_RECEBIMENTO_OS_STORAGE.md`, seção “Homologação em Preview”, depois do deploy de Preview e da migration no banco correspondente.
