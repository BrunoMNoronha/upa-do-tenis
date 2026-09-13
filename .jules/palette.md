## 2024-05-18 - Added loading state to Button component
**Learning:** Adding a native loading state (`isLoading`) to a core UI component (`Button`) improves feedback across the entire application simultaneously. This is highly effective as it prevents multiple manual, inconsistent loading implementations. Wait, I should make this entry according to the guidelines.
**Action:** Always verify if a core UI component supports native loading states. If not, implementing it centrally adds immense value and consistency, specifically by rendering an SVG spinner while retaining the disabled state.

## 2025-03-08 - Accessible Combobox Keyboard Support
**Learning:** Comboboxes require specific ARIA attributes (`role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`) and full keyboard support (Up, Down, Enter, Esc) to be accessible. Standard `<div>` wrapping an input lacks this capability by default.
**Action:** When creating or modifying complex interactive components like Combobox, always implement standard keyboard navigation and ARIA roles for screen reader and keyboard-only users.

## 2026-09-12 - Rótulos associados no seletor de datas
**Aprendizado:** useId permite associar rótulos e campos sem duplicar IDs entre instâncias.
**Ação:** Preservar o indicador de foco vigente e vincular cada Label ao Input correspondente.

## 2025-03-09 - Accessible Combobox Options Keyboard Support
**Learning:** Comboboxes are complex interactive components. While `role="combobox"` and `role="listbox"` define the structure, individual options rendered as `<div>` tags fail native keyboard interaction (like Enter/Space activation when focused) and screen reader expectations even with `onClick` and `role="option"`.
**Action:** When implementing interactive options in custom select components like Combobox, always use `<button type="button">` instead of `<div>` for the `role="option"` elements. Combine this with `w-full text-left` to visually mimic block-level elements while preserving native accessibility.
