# Catálogo público, carrinho e pedido via WhatsApp (#273)

Contrato aprovado pelo usuário em 2026-10-05. Ele resolve as decisões pendentes da issue antes da implementação.

## Decisões

| Decisão | Escolha |
| --- | --- |
| Quais produtos aparecem | Marcação no painel (`Produto.publicadoNoCatalogo`, padrão `false`). Nada fica público por padrão. |
| Propagandas/banners | Fora do MVP. Ficam para uma issue futura. |
| Imagens | Upload no cadastro do produto, pelo mesmo fluxo das fotos de OS, em pasta separada (`catalogo/produtos/{produtoId}/`). |
| Sem estoque | O produto é ocultado do catálogo e não pode entrar no carrinho. O estoque exato nunca é exposto. |
| Quantidade | Inteira, ≥ 1. |
| WhatsApp de destino | Apenas o número salvo e validado em Configurações → Dados da empresa. Sem número configurado, o botão fica indisponível e o resumo pode ser copiado. Não há fallback para o número fixo do código. |
| Entrega | Em dois PRs empilhados: (1) migration, publicação e imagem no painel; (2) `/catalogo`, carrinho e WhatsApp. |

A migration aditiva `20261005120000_add_catalogo_produto` foi autorizada explicitamente. Ela adiciona `publicadoNoCatalogo BOOLEAN NOT NULL DEFAULT false` e `imagemPathname TEXT` em `Produto`.

## Regra de visibilidade

`src/lib/catalogo-regras.ts` → `situacaoNoCatalogo()`:

- `FORA_DO_CATALOGO`: o produto não foi marcado para publicação.
- `OCULTO_INATIVO`: marcado, mas inativo.
- `OCULTO_SEM_ESTOQUE`: marcado e ativo, mas com estoque ≤ 0.
- `VISIVEL`: marcado, ativo e com estoque > 0. É a única situação exibida ao visitante.

O painel de Produtos mostra a situação de cada produto e tem o botão "Publicar no catálogo" / "Retirar do catálogo".

## Imagem do produto

- Rotas autenticadas em `/api/produtos/[id]/imagem`: GET (proxy), POST (multipart, campo `imagem`) e DELETE.
- Usa a mesma validação das fotos de OS: JPEG/PNG/WebP, até 4 MB após a otimização no navegador, com conferência dos magic bytes.
- Fica no Blob privado. O pathname nunca vai ao navegador; o painel usa `possuiImagem`.
- A troca é otimista (`updateMany` condicionado à imagem anterior). Em conflito ou erro, o blob novo é removido. Excluir o produto remove a imagem do storage, sem impedir a exclusão se o storage falhar.
- No catálogo, a imagem sai por uma rota pública própria. Ela só responde quando o produto está `VISIVEL`.

## Superfície pública (PR 2)

- `/catalogo` é uma página pública. Não importa `auth-server`, não exige sessão e não é afetada pelo caixa com fechamento pendente.
- A página é adicionada explicitamente ao middleware. A política geográfica continua valendo.
- A projeção pública contém apenas id, nome, descrição, preço e indicação de imagem. Ficam de fora estoque, datas, movimentações e configurações.
- O carrinho é anônimo e fica no `localStorage` (`upa-do-tenis:catalogo:carrinho:v1`). Guarda `{produtoId, nome, precoCentavos, quantidade}`, sem dados pessoais; o preço é o que o visitante viu e serve para detectar mudança na revisão. Dados corrompidos são descartados com aviso, sem quebrar a página. Sem armazenamento disponível, o carrinho funciona só em memória.
- Limites: até 50 produtos distintos e 99 unidades por item.
- As rotas públicas são `/catalogo`, `GET /api/catalogo/produtos?ids=` (revalidação, sem cache) e `GET /api/catalogo/produtos/[id]/imagem` (só para produto visível, `Cache-Control: public, no-cache` com ETag). Rotas administrativas, como `/api/produtos`, continuam exigindo sessão.
- Antes de abrir o WhatsApp, o carrinho é revalidado por leitura pública limitada. Se o preço mudou ou o produto foi retirado, isso é exibido para revisão; não há substituição silenciosa.
- Os valores são calculados em centavos inteiros.
- O link `wa.me` tem o texto codificado. Acima de 2000 caracteres, o link abre a conversa com uma mensagem curta e o visitante cola o resumo, que sempre fica visível e pode ser copiado.
- O clique não apaga o carrinho e não mostra "pedido recebido".
- O fluxo não cria venda, OS, reserva, pagamento nem movimento de caixa ou estoque.

## Fora do escopo

Banners, checkout/pagamento online, frete, cupons, conta de cliente, WhatsApp Business API, analytics e categorias.
