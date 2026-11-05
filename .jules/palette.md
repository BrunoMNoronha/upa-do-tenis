## 2023-11-20 — Accessibility in Forms using React Hook Form

**Learning:** Forms utilizing client-side validation libraries like React Hook Form often neglect native programmatic accessibility, leaving error states invisible to screen readers. Inputs lack `aria-invalid` and `aria-describedby` when errors occur, and error messages lack unique `id`s connecting them back to the input. Additionally, form elements miss the `noValidate` attribute, causing browsers to show unstyled native tooltips before the app logic can handle them. Global submit errors also often miss `role="alert"`.

**Action:** Whenever reviewing a form managed by `react-hook-form`, ensure that:
1. The `<form>` tag includes `noValidate` to bypass native browser validation.
2. The `<Input>` tags dynamically receive `aria-invalid={Boolean(errors.fieldName)}`.
3. The `<Input>` tags dynamically receive `aria-describedby={errors.fieldName ? "fieldName-error" : undefined}`.
4. If there's a static hint for the field, include it in the `aria-describedby` as well: `"fieldName-error fieldName-hint"`.
5. Error messages receive the corresponding `id="fieldName-error"`.
6. Global submission error messages receive `role="alert"`.

## 2024-05-14 — Associações de acessibilidade para elementos bloqueados

**Learning:** Ao criar interfaces de listagem de opções interativas onde um elemento de botão pode estar bloqueado (disabled), é fundamental prover à tecnologia assistiva o motivo do bloqueio. O atributo `aria-describedby` que vincula ao texto explicativo não deve ser removido quando o botão está habilitado, desde que o elemento associado (no caso, a indicação de estado como "no carrinho") seja renderizado e útil de ser lido nesse contexto. Se o texto vinculado for removido condicionalmente, os IDs do `aria-describedby` também devem ser tratados para evitar vínculos vazios ou quebrados.

**Action:** Quando melhorar botões de ação que possuem uma condição que exibe por que a ação está bloqueada ou alguma informação de estado condicional, e houver um fallback ou outro elemento visual exibido na mesma posição, garanta que o identificador de `aria-describedby` (como no caso de `idMotivo` em botões de "Adicionar") seja aplicado consistentemente tanto ao parágrafo do motivo do erro quanto ao parágrafo da mensagem alternativa (como "X no carrinho"), ativando a associação no botão independentemente de estar bloqueado ou não (caso a informação seja pertinente ao estado).
