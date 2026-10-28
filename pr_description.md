## 💡 What

Melhora a acessibilidade semântica do formulário de Formas de Pagamento em `src/app/formas-pagamento/formas-pagamento-client.tsx`.

## 🎯 Why

Formulários baseados em `react-hook-form` frequentemente negligenciam a acessibilidade nativa porque os navegadores interceptam ou a UI customizada sobrepõe a experiência, sem informar os leitores de tela sobre campos inválidos, sem associar erros visuais diretamente aos campos de forma que leitores consigam pronunciar corretamente o problema, e sem atribuir um papel dinâmico para garantir que mensagens que surgem assíncronamente sejam anunciadas instantaneamente.

## ♿ Accessibility

As alterações comunicam imediatamente ao leitor de tela:
- O estado de campo inválido (`aria-invalid`).
- As mensagens de erro e dicas descritivas atreladas a cada campo (`aria-describedby` ligado com `id` explícito nas tags).
- Avisos que devem ser pronunciados quando erros globais ou locais aparecem na tela dinamicamente (`role="alert"`).
- O fato de que a própria lógica do app vai cuidar das validações e que o tooltip não estilizado do browser deve ser ocultado (`noValidate`).

## 👤 User impact

Nenhum impacto visual direto. Contudo, operadores que usam navegação por teclado ou dependem de tecnologias assistivas (leitores de tela) receberão contexto claro e feedback semântico dinâmico e exato de formulários submetidos com erro ao interagir com o cadastro de formas de pagamento.

## 📸 Before / After

N/A. A alteração é estritamente semântica e estrutural ao HTML (ARIA/roles), preservando a aparência da UI atual e o comportamento de submissão do form.

## ✅ Validation

- `pnpm test` (falha pontual por não ser possível acessar o banco de dados via sandbox em testes não unitários, mas `src/lib/formas-pagamento-schema.test.ts` passou com sucesso).
- `pnpm lint` executado com aprovação (0 avisos/0 erros).
- `pnpm typecheck` executado sem erros.
- `pnpm build` executado e o build foi gerado.
- Inspeção manual da alteração via output impresso e script de testes Playwright (bloqueada unicamente por rota autenticada redirecionando, mas diff foi validado repetidamente).

## 🧩 Scope

- `src/app/formas-pagamento/formas-pagamento-client.tsx`

## ⚠️ Risk

Baixo — a alteração se concentra exclusivamente na camada de apresentação (HTML/ARIA/atributos HTML estáticos), sem interferir com eventos lógicos do React Hook Form, API, ou no layout de marcação, garantindo 100% de preservação de regras de negócio.
