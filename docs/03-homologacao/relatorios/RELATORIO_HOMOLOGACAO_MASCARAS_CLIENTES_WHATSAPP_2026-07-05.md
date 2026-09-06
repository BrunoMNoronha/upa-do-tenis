# Relatório de Homologação — Máscaras de Clientes + WhatsApp na Lista

## Resumo executivo

Correção de bug no módulo de Clientes: os campos Telefone e CPF/CNPJ aceitavam letras e caracteres inválidos durante a digitação. A causa raiz era que `formatPhone` e `formatCPFCNPJ` (usados no `onChange` do formulário) só aplicam máscara quando o número de dígitos está completo (10/11 para telefone, 11/14 para CPF/CNPJ) — para entrada parcial devolviam o valor original intacto, incluindo letras. Foram criadas duas máscaras progressivas de digitação (`maskPhone` e `maskCPFCNPJ`) em `src/lib/formatters.ts`, que aceitam apenas dígitos, limitam o tamanho (11 e 14) e mascaram parcialmente conforme o usuário digita. Os formatters originais não foram alterados, preservando a exibição já homologada na Lista de OS. Adicionalmente, a Lista de Clientes ganhou link para WhatsApp reutilizando o helper existente `whatsappLink` (o mesmo da Lista de OS — nenhuma lógica duplicada), com telefone mascarado e link renderizado apenas quando o telefone é válido. Nenhuma área crítica (financeiro, caixa, estoque, insumos, pagamentos, relatórios) nem `schema.prisma` foi tocada. Lint, testes (182, incluindo 13 novos) e build passaram; validação manual executada em navegador.

## Ambiente

- **Projeto:** UPA do Tênis - Sapataria Alves
- **Branch:** `main`
- **Commit anterior (base da correção):** `e974c9b` — "feat: reorganizar menu lateral expansivel"
- **Data da homologação:** 05/07/2026
- **Responsável pela execução:** Claude Code (agente), a pedido de Bruno M Noronha
- **Ambiente:** `pnpm run dev` local (porta 3000 via preview), Next.js 14.2.35, banco PostgreSQL local (`.env`)
- **Método:** validação combinada — `lint`/`test`/`build` + sessão de browser automatizado (preview) cobrindo digitação com letras nos dois campos, exibição de erro, link WhatsApp na Lista de Clientes e não regressão da Lista de OS

## Causa raiz

`formatPhone` e `formatCPFCNPJ` retornam o valor recebido **sem alteração** quando a quantidade de dígitos não corresponde ao tamanho final esperado. Como o formulário de clientes os usava diretamente no `onChange`, qualquer digitação parcial (ex.: "61985fyt") passava sem sanitização e as letras permaneciam no campo. O payload enviado à API já era sanitizado (o schema Zod aplica `sanitizePhone`/`sanitizeCPFCNPJ` no preprocess e a API revalida com o mesmo schema), então o defeito era restrito à experiência de digitação — mas o formulário também não exibia a mensagem de erro de CPF/CNPJ inválido.

## Escopo validado

1. Novas máscaras progressivas de digitação em `src/lib/formatters.ts`:
   - `maskPhone`: apenas dígitos, máximo 11, máscara parcial durante a digitação, "(DD) 9999-9999" para 10 dígitos e "(DD) 99999-9999" para 11.
   - `maskCPFCNPJ`: apenas dígitos, máximo 14, máscara dinâmica — CPF ("000.000.000-00") até 11 dígitos, CNPJ ("00.000.000/0000-00") a partir de 12.
2. Formulário de clientes passa a usar as novas máscaras no `onChange` e exibe a mensagem de erro de `cpfCnpj` (antes ausente).
3. Lista de Clientes: telefone exibido com máscara e como link para `https://wa.me/55<dígitos>` quando válido, reutilizando `whatsappLink` e `formatPhone` — mesmo padrão visual e de código da Lista de OS; sem link quando o telefone é inválido; CPF/CNPJ exibido formatado.
4. `formatPhone`, `formatCPFCNPJ` e `whatsappLink` originais intocados — Lista de OS sem regressão.
5. Backend já validava/sanitizava (schema Zod compartilhado) — confirmado, sem alteração necessária.
6. 13 novos testes unitários para `maskPhone` e `maskCPFCNPJ` (letras, máscara parcial, limites de tamanho, alternância CPF→CNPJ).

## Escopo excluído (por definição da correção)

- Qualquer alteração em `schema.prisma` ou banco de dados.
- Qualquer alteração em financeiro, caixa, estoque, insumos, pagamentos ou relatórios.
- Validação de dígitos verificadores de CPF/CNPJ (validação atual por tamanho mantida, sem quebrar fluxo homologado).
- Troca de biblioteca de máscara (não há biblioteca; máscara própria mantida).

## Arquivos alterados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/lib/formatters.ts` | modificado | Novas funções `maskPhone` e `maskCPFCNPJ` (máscaras progressivas de digitação); nada existente alterado |
| `src/app/clientes/clientes-form.tsx` | modificado | `onChange` usa as novas máscaras; exibição do erro de `cpfCnpj` |
| `src/app/clientes/page.tsx` | modificado | Telefone mascarado + link WhatsApp (reuso de `whatsappLink`/`formatPhone`); CPF/CNPJ formatado na exibição |
| `src/__tests__/formatters.test.ts` | modificado | +13 testes para as novas máscaras |

---

## Cenários executados — ✅ TODOS APROVADOS

| # | Cenário | Resultado esperado | Resultado obtido |
|---|---|---|---|
| 1 | Digitar "61985fyt" no Telefone | Letras não permanecem; máscara parcial | ✅ Campo ficou "(61) 985" |
| 2 | Telefone parcial/inválido no submit | Mensagem de erro clara | ✅ "Telefone inválido." exibida (modo onChange) |
| 3 | Digitar "ewe" em CPF/CNPJ | Campo permanece vazio | ✅ Campo vazio |
| 4 | Digitar 21 dígitos em CPF/CNPJ | Limita a 14 com máscara de CNPJ | ✅ "11.122.233/3445-56" |
| 5 | Telefone 11 dígitos | "(DD) 99999-9999" | ✅ Teste unitário + browser |
| 6 | Telefone 10 dígitos | "(DD) 9999-9999" | ✅ Teste unitário |
| 7 | CPF 11 dígitos | "000.000.000-00" | ✅ Teste unitário |
| 8 | CNPJ 14 dígitos | "00.000.000/0000-00" | ✅ Teste unitário |
| 9 | Cliente com telefone válido na lista | Link WhatsApp com telefone mascarado | ✅ `https://wa.me/5511999998888`, texto "(11) 99999-8888" |
| 10 | Cliente sem telefone válido | Sem link quebrado (texto simples ou nada) | ✅ Guardas `!telefone` e `!link` (mesmo padrão da Lista de OS) |
| 11 | Lista de OS | WhatsApp continua funcionando | ✅ Link presente e correto em `/ordens-servico` |
| 12 | Console do navegador | Sem erros | ✅ Console limpo |
| 13 | Payload da API | Apenas dígitos (schema Zod com preprocess) | ✅ Comportamento pré-existente confirmado (sanitize + revalidação na API) |

## Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `git status` / `git diff --stat` | Árvore limpa na base (`e974c9b`); ao final: 4 arquivos alterados (+118/−7), nada além disso |
| `git diff -- prisma/schema.prisma` | ✔ Sem diff (schema intocado) |
| `pnpm run lint` | ✔ Sem erros ou warnings |
| `pnpm run test` | ✔ 21 arquivos, 182 testes aprovados (169 anteriores + 13 novos) |
| `pnpm run build` | ✔ Build de produção completo; 26 rotas geradas |

## Evidências (para re-execução manual)

1. Login → Clientes. No campo Telefone, digitar "61985fyt": só "(61) 985" permanece e aparece "Telefone inválido." até completar 10/11 dígitos.
2. Completar "61985307168": campo mostra "(61) 98530-7168" e o erro some.
3. No campo CPF ou CNPJ, digitar "ewe": campo permanece vazio. Digitar 11 dígitos: máscara de CPF; continuar digitando até 14: máscara muda para CNPJ; dígitos extras são ignorados.
4. Cadastrar o cliente e conferir na lista ao lado: telefone aparece mascarado, em cor de destaque, e clicável — abre `wa.me` com o número correto (55 + DDD + número).
5. Cliente antigo com telefone fora do padrão (se existir): telefone aparece como texto simples, sem link.
6. Ir para Ordens de Serviço: link de WhatsApp dos cards continua funcionando como antes.

## Riscos remanescentes

- **Validação de CPF/CNPJ continua apenas por tamanho** (11 ou 14 dígitos), sem dígito verificador — comportamento pré-existente, mantido de propósito para não quebrar fluxo homologado. Pode ser evoluído em fase futura.
- **Clientes antigos com telefone inválido gravado** (se houver) aparecem sem link e sem máscara — comportamento intencional (não gerar link quebrado).
- **Ressalva operacional (pré-existente):** `pnpm run test` apaga tabelas de insumos do banco apontado pelo `.env`. Confirmar sempre que o `.env` aponta para banco local de desenvolvimento antes de rodar a suíte.

## Pendências (registradas para fase futura)

1. Avaliar validação de dígitos verificadores de CPF/CNPJ.
2. Avaliar reuso de `maskPhone`/`maskCPFCNPJ` em outros formulários que capturam telefone/documento (ex.: cadastro via OS), se houver.

## Veredito

```markdown
# Veredito — Máscaras de Clientes + WhatsApp na Lista

[x] Aprovado
[ ] Aprovado com ressalvas
[ ] Reprovado

Observações:
- Todos os critérios de aceite atendidos e verificados em navegador.
- Lógica de WhatsApp reutilizada do helper existente (`whatsappLink`) — nenhuma duplicação.
- Formatters de exibição originais intocados; Lista de OS sem regressão.
- Nenhuma área crítica, API financeira ou schema alterados.
```

## Recomendação

Correção apta para commit. Push é decisão do responsável pelo projeto.
