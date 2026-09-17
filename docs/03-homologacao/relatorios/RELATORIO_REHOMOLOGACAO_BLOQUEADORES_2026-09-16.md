# Re-homologação dos bloqueadores — 2026-09-16

Execução manual integrada no navegador, contra o servidor local, das correções descritas em `RELATORIO_CORRECAO_BLOQUEADORES_2026-09-16.md`. Nenhum arquivo de código, schema ou migration foi alterado. Não houve commit, push ou deploy.

## Histórico da execução

1. **Primeira tentativa: interrompida na Etapa 2.**
   - `BLOB_READ_WRITE_TOKEN` estava ausente em todos os escopos de ambiente.
   - Não havia sessão autenticada.
   - Nada foi contornado.
2. **Desbloqueio.** O usuário configurou o token de um store Blob de teste em `.env.local`, que é ignorado pelo Git. O servidor de desenvolvimento foi reiniciado e o login foi feito pelo próprio usuário.
3. **Conferência do store, sem exibir o token.** Foi comparado o identificador do store embutido no token com a variável `BLOB_STORE_ID` do projeto na Vercel. Os valores são diferentes, então o token **não** pertence ao store de produção.

## Ambiente

- Branch: `main`.
- SHA: `620106ccd140ba0e9503fcfb32df7fe35131d7f7`.
- Working tree: igual à do relatório de correção, mais este relatório.
- Banco usado pela aplicação: `localhost:5434/upa_do_tenis_dev`.
  - `prisma migrate status`: 10 migrations, *Database schema is up to date*, incluindo `20260916210000_add_galeria_fotos_item_os`.
- Banco dos testes automatizados: `localhost:5434/upa_do_tenis_test`, separado.
- Aplicação local: `next dev` na porta 3000, com `Environments: .env.local, .env`. Não houve erro na inicialização.
- Blob configurado: **sim**, com store de teste distinto do de produção. O token não foi exibido nem versionado.

## Dados criados nesta execução (identificador `REHOM-1609`)

| Registro | Identificação |
|---|---|
| Cliente | `Cliente REHOM-1609 Re-homologacao` (`cmu4ub26a0000uij1h7nouczy`) |
| Serviço | `Servico REHOM-1609 Limpeza`, R$ 100,00 (`cmu4ubl4q0001uij1vl2d7t63`) |
| Forma de pagamento | `Dinheiro REHOM-1609`, tipo DINHEIRO (`cmu4uhy1g000muij1t42i09w1`). O banco não tinha nenhuma forma cadastrada |
| OS A | `OS-16092026-9101` (`cmu4ue4bm0004uij1d4352bhz`): foto real e fluxo financeiro |
| OS B | `OS-16092026-9102` (`cmu4uflhi000euij15u7zrwkb`): falha de upload e captura mobile |
| Caixa | `cmu4uick4000nuij17kg2je4a`: saldo inicial R$ 50,00, já fechado |
| Fotos no Blob de teste | 3 (1 na OS A e 2 na OS B) |

## Cenários executados

| Cenário | Resultado | Evidência | Observação |
|---|---|---|---|
| Criação de cliente | Aprovado | `POST /api/clientes` → 201; lista passou de 1 para 2 | — |
| Criação de serviço | Aprovado | `POST /api/servicos` → 201; R$ 100,00 exibido | — |
| Criação da OS | Aprovado | `POST /api/ordens-servico` → 201 (OS A e OS B); banco com total 100, pago 0, saldo 100 | — |
| Atualização visual da listagem | Aprovado | Contador de 1 para 2 (OS A) e de 2 para 3 (OS B) sem recarregar; única entrada de navegação do tipo `navigate`, anterior ao cadastro | Na OS B a lista atualizou com o formulário ainda aberto, após a falha do upload |
| Detalhe da OS / HTTP 200 | Aprovado | `GET /api/ordens-servico/{id}` → 200; página de detalhe → 200 nas duas OS | — |
| Dados persistidos | Aprovado | Consulta somente leitura: cliente, item, serviço, valores e observações conforme digitados | — |
| Upload real de foto | Aprovado com ressalva | `POST …/itens/{item}/fotos` → 201; registro `FotoItemOrdem` criado; `GET …/fotos/{fotoId}` → 200; imagem renderizada em 1200×900 ao reabrir a OS | Imagem JPEG gerada no navegador (canvas) e anexada ao input real do formulário. Otimização no cliente, API, Blob e leitura foram reais; o conteúdo não é uma fotografia de câmera |
| Falha de upload | Aprovado com ressalva | Resposta 503 simulada no navegador, apenas para o POST de foto; OS persistida (201); lista com 3 OS; mensagens exibidas; botão de envio desabilitado e sem novo POST de OS; reenvio → 201; banco com 1 foto e sem duplicidade | Falha simulada por interceptação de `fetch` no navegador, sem alterar código. Não é uma queda real de rede ou do Blob |
| Captura mobile | Aprovado com ressalva | Viewport 375×812 com user-agent Android; arquivo aplicado ao input `capture="environment"` do detalhe; "Salvar fotos" → 201; galeria "2 de 5" e as duas imagens renderizadas | Emulação: a câmera física de um aparelho real não foi usada |
| Tramitação e status | Aprovado | `PATCH …/status` → 200 duas vezes: Aberta → Em Andamento → Concluída; data de conclusão registrada | Aviso de WhatsApp dispensado com "Agora não" |
| Histórico da OS | Aprovado | Linha do tempo com as 2 transições; banco com 2 registros de histórico | — |
| Serialização Decimal | Aprovado | 25 rotas (páginas e APIs) com HTTP 200; nenhum log com `Decimal` ou warning no servidor; console sem erros de serialização; preço do catálogo exibido corretamente no formulário de OS | O diff só converte `precoBase` com `.toString()` na fronteira; nenhum cálculo foi para o frontend |
| Pagamento parcial (R$ 40) | Aprovado | `POST …/pagamentos` → 201; detalhe com pago 40, saldo 60, status Parcial | Ver defeito pré-existente P1 abaixo (data exibida) |
| Pagamento acima do saldo (R$ 70 com saldo 60) | Aprovado (bloqueio) | 400: "Pagamento acima do saldo pendente não é permitido."; continua com 1 lançamento | — |
| Pagamento total (R$ 60) | Aprovado | 201; pago 100, saldo 0, status Pago; formulário de recebimento deixa de ser exibido | — |
| Recebimento após quitação | Aprovado (bloqueio) | API com R$ 1,00 → 400 (acima do saldo); com R$ 0,00 → 400 ("deve ser maior que zero") | Chamado direto na API, porque a interface oculta o formulário |
| Caixa | Aprovado | Aberto com R$ 50 → R$ 90 → R$ 150; 2 entradas `PAGAMENTO_OS`, cada uma ligada ao seu pagamento; fechamento com R$ 150 informado → calculado 150, divergência 0, status FECHADO | Banco sem movimentação órfã e sem duplicidade (2 pagamentos = 2 movimentações) |
| Relatório financeiro | Aprovado | Antes: pago 0, saldo 300. Depois do parcial: pago 40, saldo 260, 1 Parcial, linha da OS 100/40/60. Final: pago 100, saldo 200, 1 Pago, gráfico 33,3%, linha 100/100/0 | Dashboard (`/api/dashboard`) também coerente: recebido 100, pendente 200 |

## Validações automáticas

Executadas após a homologação manual:

| Comando | Resultado |
|---|---|
| `pnpm run lint` | Sucesso: sem warnings ou erros do ESLint (aviso de depreciação do `next lint`) |
| `pnpm run typecheck` | Sucesso |
| `pnpm run test` | Sucesso: **1.182 testes em 111 arquivos** |
| `pnpm run build` | Sucesso: compilação, tipos e 16 páginas estáticas. O servidor de desenvolvimento foi parado antes e reiniciado depois |
| `git status` / `git diff --stat` | Os mesmos 3 arquivos modificados (+20/−6) e os arquivos não versionados do relatório de correção, mais este relatório. `.env.local` confirmado como ignorado |

## Problemas encontrados

### P1 — Data do pagamento exibida com um dia a menos (pré-existente, fora do escopo)

- **Sintoma.** Um pagamento registrado com data 16/09/2026 aparece como "15/09/2026, 21:00" na lista de pagamentos do detalhe da OS.
- **Causa.** `ordens-servico-pagamentos-schema.ts` usa `z.coerce.date()` com o valor `"2026-09-16"`, que é gravado como `2026-09-16T00:00:00Z`. `HistoricoPagamentosList.tsx` formata esse valor no fuso local (UTC−3).
- **Origem.** Existe desde o commit `84db381` (2026-07-03). Não foi introduzido pelas correções em revisão, que não tocam esses arquivos.
- **Impacto observado.** Somente na exibição. Valor, saldo, caixa, relatório e dashboard permaneceram corretos. Há risco de o pagamento cair no dia anterior em consultas que filtram por `dataPagamento` usando limites no horário local; o dashboard, no período padrão, não foi afetado.
- **Ação.** Nada foi corrigido, conforme a restrição sobre regras financeiras. Recomenda-se tratar em uma tarefa própria, com teste.

Nenhum defeito foi encontrado nas três correções re-homologadas.

## Riscos remanescentes

- Nenhuma fotografia real de câmera foi usada. O caminho técnico completo (otimização → API → Blob → leitura) foi exercitado com JPEG real gerado no navegador.
- A falha de upload foi simulada no cliente, com resposta 503. Timeouts reais e erros do próprio Blob não foram provocados.
- A captura mobile foi emulada. Recomenda-se um teste rápido em aparelho físico antes da liberação ao balcão.
- O defeito P1 continua aberto.
- O processo de migration continua dependendo do preflight documentado no README; nenhum mecanismo automático impede subir a aplicação com migration pendente.
- Os dados `REHOM-1609` permanecem no banco de desenvolvimento e as 3 fotos no store Blob de teste, para rastreabilidade. Não foi feita limpeza.

## Veredito

**APROVADO COM RESSALVAS**

Os critérios obrigatórios foram efetivamente exercitados na interface:
- upload real para o Blob, com persistência e exibição;
- atualização da listagem sem recarregar, inclusive com upload falho;
- fluxo pagamento → caixa → relatório, com bloqueios.

As ressalvas são: conteúdo sintético da imagem, falha de upload simulada no cliente, captura mobile emulada e o defeito pré-existente P1.
