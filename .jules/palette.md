## 2024-05-18 - Added loading state to Button component
**Learning:** Adding a native loading state (`isLoading`) to a core UI component (`Button`) improves feedback across the entire application simultaneously. This is highly effective as it prevents multiple manual, inconsistent loading implementations. Wait, I should make this entry according to the guidelines.
**Action:** Always verify if a core UI component supports native loading states. If not, implementing it centrally adds immense value and consistency, specifically by rendering an SVG spinner while retaining the disabled state.

## 2025-03-08 - Accessible Combobox Keyboard Support
**Learning:** Comboboxes require specific ARIA attributes (`role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`) and full keyboard support (Up, Down, Enter, Esc) to be accessible. Standard `<div>` wrapping an input lacks this capability by default.
**Action:** When creating or modifying complex interactive components like Combobox, always implement standard keyboard navigation and ARIA roles for screen reader and keyboard-only users.

## 2026-09-12 - Rótulos associados no seletor de datas
**Aprendizado:** useId permite associar rótulos e campos sem duplicar IDs entre instâncias.
**Ação:** Preservar o indicador de foco vigente e vincular cada Label ao Input correspondente.

## 2024-05-18 - Form validation accessibility
**Learning:** Form validation messages are often rendered without proper programmatic association to their respective inputs (missing `aria-describedby` and `aria-invalid`), and global/submission errors lack `role="alert"`. This prevents screen readers from correctly announcing errors to users when they occur.
**Action:** When implementing or fixing forms, always link field-level error messages directly to their inputs using a matching `id` and `aria-describedby`, set `aria-invalid` based on the error state, and explicitly use `role="alert"` on global submission error messages.

## 2026-09-15 - Estado de carregamento inconsistente nos botões
**Aprendizado:** Botões de ação manipulavam texto manualmente junto de `disabled` para expressar submissão ("Salvando...", "Carregando..."), causando saltos visuais e feedback divergente, embora `<Button>` já ofereça `isLoading` nativo com spinner.
**Ação:** Usar sempre `isLoading` do design system; manter `disabled` apenas para regras de negócio adicionais (ex.: carrinho vazio), pois `isLoading` já desabilita o botão.
