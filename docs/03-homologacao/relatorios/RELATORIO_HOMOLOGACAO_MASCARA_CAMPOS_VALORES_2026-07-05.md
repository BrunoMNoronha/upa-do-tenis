# Relatório de Homologação — Máscara de Digitação dos Campos de Valores

## Resumo executivo

Correção do bug de digitação nos campos monetários do sistema. Todos os 6 campos de valores em texto livre (Preço Base em Serviços, Valor total em OS, Custo Unitário em Insumos e os 3 campos do Caixa: saldo inicial, valor de movimentação e saldo informado no fechamento) aplicavam `formatCurrency` a cada tecla digitada. Como `formatCurrency` formata o valor completo com 2 casas decimais via `Intl`, o segundo dígito digitado caía depois da vírgula e era arredondado — **digitar "150" resultava em "R$ 1,01"**, tornando impossível informar valores com mais de um dígito. A correção introduz a máscara leve `maskCurrency` (mantém dígitos, pontos e uma única vírgula com até 2 casas decimais; remove letras e símbolos) aplicada durante a digitação, e move a formatação completa de moeda para o evento `blur` (ao sair do campo, "150" vira "R$ 150,00"). **Nenhum sanitizador, cálculo financeiro, API, regra de caixa/estoque ou schema foi alterado** — `sanitizeCurrency` (que converte o texto em número antes do envio, em todos os 6 fluxos) permanece intocado e cobre todos os formatos que a máscara permite. Lint, testes (187, incluindo 5 novos) e build passaram; validação manual executada em navegador nos formulários de Serviços e OS.

## Ambiente

- **Projeto:** UPA do Tênis - Sapataria Alves
- **Branch:** `main`
- **Commit anterior (base da correção):** `3923850` — "fix(clientes): sanitizar mascaras de telefone e CPF/CNPJ e adicionar WhatsApp na lista"
- **Data da homologação:** 05/07/2026
- **Responsável pela execução:** Claude Code (agente), a pedido de Bruno M Noronha
- **Ambiente:** `pnpm run dev` local (porta 3000 via preview), Next.js 14.2.35, banco PostgreSQL local (`.env`)
- **Método:** validação combinada — `lint`/`test`/`build` + sessão de browser automatizado (preview) com digitação tecla a tecla e blur nos formulários de Serviços e OS

## Causa raiz

Os campos monetários usavam `onChange={(e) => e.target.value = formatCurrency(e.target.value)}` (ou equivalente com estado controlado no Caixa). `formatCurrency` sanitiza e formata o valor **completo** ("R$ X,XX"). Na segunda tecla, o campo já continha "R$ 1,00"; o novo dígito era anexado após os centavos ("R$ 1,005"), reinterpretado como 1,005 e arredondado para "R$ 1,01". A partir daí nenhum dígito adicional alterava o valor. Letras não persistiam (a sanitização as removia), mas o valor exibido ficava corrompido.

## Escopo validado

1. Nova função `maskCurrency` em `src/lib/formatters.ts`: máscara leve de digitação — mantém dígitos, pontos (separador de milhar ou decimal) e uma única vírgula com até 2 casas decimais; remove letras e símbolos. O usuário vê exatamente o que digita.
2. Formatação completa de moeda (`formatCurrency`) movida para o `onBlur` de cada campo: ao sair do campo, "150" vira "R$ 150,00", "15,9" vira "R$ 15,90".
3. Campos corrigidos (6):
   - `precoBase` — formulário de Serviços;
   - `valorEstimado` — formulário de nova OS;
   - `custoUnitario` — formulário de Insumos;
   - `saldoInicial`, `valorMov`, `saldoInformado` — Caixa (abertura, movimentação e fechamento).
4. Conversão para número no envio **inalterada**: os schemas Zod de Serviços/OS/Insumos e as chamadas explícitas do Caixa continuam usando `sanitizeCurrency`, que já cobre todos os formatos que a máscara permite ("150", "15,9", "1.500,50", "R$ 150,00").
5. 5 novos testes unitários para `maskCurrency`, incluindo round-trip com `formatCurrency`/`sanitizeCurrency`.

## Escopo excluído (por definição da correção)

- Qualquer alteração em `sanitizeCurrency`, `formatCurrency` ou cálculos financeiros.
- Qualquer alteração em APIs, regras de caixa, estoque, insumos, pagamentos ou relatórios.
- Qualquer alteração em `schema.prisma` ou banco de dados.
- Campos `type="number"` (valor de pagamento na OS, quantidades, custo em movimentações de insumo) — usam validação nativa do navegador e não apresentam o bug.

## Arquivos alterados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/lib/formatters.ts` | modificado | Nova função `maskCurrency`; nada existente alterado |
| `src/app/servicos/servicos-form.tsx` | modificado | `onChange` com `maskCurrency`; formatação no `onBlur` |
| `src/app/ordens-servico/ordens-servico-client.tsx` | modificado | Idem, campo `valorEstimado` |
| `src/app/insumos/insumos-form.tsx` | modificado | Idem, campo `custoUnitario` |
| `src/app/caixa/caixa-client.tsx` | modificado | Idem, 3 campos (abertura, movimentação, fechamento) |
| `src/__tests__/formatters.test.ts` | modificado | +5 testes para `maskCurrency` |

---

## Cenários executados — ✅ TODOS APROVADOS

| # | Cenário | Resultado esperado | Resultado obtido |
|---|---|---|---|
| 1 | Reprodução do bug (antes da correção) | Digitar "150" corrompia o valor | ✅ Reproduzido: "150" → "R$ 1,01" |
| 2 | Digitar "150" no Preço Base (Serviços) | Campo mostra "150" durante a digitação | ✅ "1" → "15" → "150", tecla a tecla |
| 3 | Blur após "150" | "R$ 150,00" | ✅ |
| 4 | Digitar "15,9abc" | Letras removidas, vírgula única aceita | ✅ Campo ficou "15,9"; blur → "R$ 15,90" |
| 5 | Digitar "250abc" no Valor total (OS) | "250" durante digitação; "R$ 250,00" no blur | ✅ |
| 6 | Segunda vírgula e 3ª casa decimal | Bloqueadas pela máscara | ✅ Testes unitários ("15,905" → "15,90"; "15,9,5" → "15,95") |
| 7 | Separador de milhar digitado | Preservado e convertido corretamente | ✅ "1.500,50" → blur "R$ 1.500,50" (round-trip testado) |
| 8 | Payload numérico no envio | `sanitizeCurrency` converte qualquer formato da máscara | ✅ Round-trip em teste unitário; fluxos de envio inalterados |
| 9 | Console do navegador | Sem erros | ✅ Console limpo |

## Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `git status` / `git diff --stat` | Base limpa (`3923850`); ao final: 6 arquivos alterados, nada além disso |
| `git diff -- prisma/schema.prisma` | ✔ Sem diff (schema intocado) |
| `pnpm run lint` | ✔ Sem erros ou warnings |
| `pnpm run test` | ✔ 21 arquivos, 187 testes aprovados (182 anteriores + 5 novos) |
| `pnpm run build` | ✔ Build de produção completo; 26 rotas geradas |

## Evidências (para re-execução manual)

1. Serviços → Preço Base: digitar "150" — o campo mostra "150" (antes virava "R$ 1,01"). Clicar fora: vira "R$ 150,00".
2. Digitar "15,9" e sair do campo: "R$ 15,90". Tentar letras ("15abc"): não entram.
3. Nova OS → Valor total: mesmo comportamento.
4. Insumos → Custo Unitário: mesmo comportamento.
5. Caixa → abrir caixa com saldo "200": campo mostra "200", blur "R$ 200,00", caixa abre com R$ 200,00. Repetir em movimentação e fechamento.
6. Conferir nos registros salvos (lista de serviços, detalhe da OS, caixa) que os valores gravados correspondem ao digitado.

## Riscos remanescentes

- **Caixa, insumos e OS são áreas críticas**: embora a alteração seja restrita à máscara de digitação (nenhum cálculo ou sanitizador tocado), recomenda-se a homologação manual do item 5 acima antes de considerar o fluxo de caixa validado em uso real.
- **Formato com ponto decimal** ("15.90") continua aceito e interpretado como decimal por `sanitizeCurrency` (comportamento pré-existente e testado).
- **Ressalva operacional (pré-existente):** `pnpm run test` apaga tabelas de insumos do banco apontado pelo `.env`. Confirmar sempre que o `.env` aponta para banco local de desenvolvimento.

## Pendências (registradas para fase futura)

1. Avaliar unificação dos campos `type="number"` (pagamentos, quantidades) com o mesmo padrão visual de moeda, se desejado.

## Veredito

```markdown
# Veredito — Máscara de Digitação dos Campos de Valores

[x] Aprovado
[ ] Aprovado com ressalvas
[ ] Reprovado

Observações:
- Bug reproduzido antes da correção e ausente depois, com verificação tecla a tecla em navegador.
- Alteração restrita à máscara de entrada; sanitizadores, cálculos, APIs e schema intocados.
- Round-trip máscara → formatação → sanitização coberto por teste unitário.
```

## Recomendação

Correção apta para commit. Push é decisão do responsável pelo projeto. Homologar manualmente o fluxo de caixa (item 5 das evidências) no uso real.

---

# ADENDO — 05/07/2026: máscara alterada para padrão por centavos

## Mudança de critério

Após revisão visual do responsável pelo projeto, o critério de aceite da digitação mudou:

- **Critério anterior (commit `23cc890`):** o operador digitava o valor em reais e a formatação acontecia no blur — "150" → (blur) → "R$ 150,00". Nesse modelo, "15050" era interpretado como R$ 15.050,00.
- **Critério novo (este adendo):** máscara monetária **por centavos**, formatando a cada tecla, com os 2 últimos dígitos como centavos — **"15050" → "R$ 150,50"** durante a digitação. Padrão operacional de balcão/PDV.

## Implementação do adendo

- `maskCurrency` reescrita em `src/lib/formatters.ts`: remove tudo que não for dígito, limita a 10 dígitos (máx. R$ 99.999.999,99), interpreta os 2 últimos como centavos e formata com `Intl.NumberFormat` pt-BR/BRL a cada tecla. Campo sem dígitos permanece vazio.
- `onChange`/`onBlur` dos 6 campos **inalterados**: o `onBlur` com `formatCurrency` é idempotente sobre a saída da máscara ("R$ 150,50" → 150.5 → "R$ 150,50"), sem dupla formatação.
- Ajuste complementar em `src/app/ordens-servico/ordens-servico-client.tsx`: ao selecionar um serviço, o Valor total agora é preenchido já formatado ("R$ 150,00" em vez de "150" cru) — sem isso, uma edição subsequente sob a máscara por centavos reinterpretaria "150" como R$ 1,50.
- `sanitizeCurrency`, cálculos, APIs e `schema.prisma` **intocados**. Round-trip coberto por teste: `sanitizeCurrency(maskCurrency("15050"))` → `150.5`.
- Testes de `maskCurrency` reescritos para o novo critério (189 testes no total).

## Evidências (browser, tecla a tecla)

| Módulo / campo | Digitado | Exibido durante a digitação | Salvo |
|---|---|---|---|
| Serviços — Preço Base | "15050abc" | "R$ 0,01" → "R$ 0,15" → "R$ 1,50" → "R$ 15,05" → **"R$ 150,50"** (letras ignoradas) | "R$ 150,50" na lista |
| OS — Valor total | "25000" | progressivo até **"R$ 250,00"** | "Valor Total R$ 250,00" |
| OS — autofill por serviço | seleção "Troca de Sola" | campo preenchido **"R$ 150,00"** formatado | — |
| Insumos — Custo Unitário | "1250" | progressivo até **"R$ 12,50"** | "Custo Ref. R$ 12,50" |
| Caixa — Saldo Inicial | "20000" | progressivo até **"R$ 200,00"** | caixa aberto com R$ 200,00 |
| Caixa — Movimentação (saída) | "5000" | progressivo até **"R$ 50,00"** | saldo 200 → 150; "-R$ 50,00" |
| Caixa — Fechamento | "15000" | **"R$ 150,00"** | divergência **R$ 0,00** |

Console do navegador sem erros ou warnings em todos os cenários. `git diff -- prisma/schema.prisma` vazio. Lint ✔, 189 testes ✔, build ✔ (26 rotas).

## Roteiro de re-homologação manual (novo critério)

1. Serviços → Preço Base: digitar "15050" e conferir "R$ 150,50" já durante a digitação.
2. Nova OS: selecionar serviço e conferir valor preenchido formatado; digitar "25000" e conferir "R$ 250,00".
3. Insumos → Custo Unitário: digitar "1250" → "R$ 12,50".
4. Caixa: abrir com "20000" (R$ 200,00), movimentar "5000" (R$ 50,00), fechar com saldo compatível e conferir divergência zero.
5. Letras/símbolos não devem aparecer em nenhum campo monetário.

## Veredito do adendo

Aprovado. Máscara por centavos validada nos 6 campos, com fluxo de Caixa fim a fim sem divergência.
