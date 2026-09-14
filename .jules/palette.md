## 2024-05-18 - Added loading state to Button component
**Learning:** Adding a native loading state (`isLoading`) to a core UI component (`Button`) improves feedback across the entire application simultaneously. This is highly effective as it prevents multiple manual, inconsistent loading implementations. Wait, I should make this entry according to the guidelines.
**Action:** Always verify if a core UI component supports native loading states. If not, implementing it centrally adds immense value and consistency, specifically by rendering an SVG spinner while retaining the disabled state.

## 2025-03-08 - Accessible Combobox Keyboard Support
**Learning:** Comboboxes require specific ARIA attributes (`role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`) and full keyboard support (Up, Down, Enter, Esc) to be accessible. Standard `<div>` wrapping an input lacks this capability by default.
**Action:** When creating or modifying complex interactive components like Combobox, always implement standard keyboard navigation and ARIA roles for screen reader and keyboard-only users.

## 2026-09-12 - Rótulos associados no seletor de datas
**Aprendizado:** useId permite associar rótulos e campos sem duplicar IDs entre instâncias.
**Ação:** Preservar o indicador de foco vigente e vincular cada Label ao Input correspondente.
## 2025-05-29 - Preserving Combobox Semantic Structure\n**Learning:** When attempting to improve accessibility of generic interactive elements by replacing `<div>` with `<button>`, do NOT apply this to custom ARIA composite widgets like Comboboxes. Replacing listbox `<div role="option">` with `<button role="option">` implicitly injects all options into the natural document tab sequence (tabIndex="0"), causing severe keyboard traps for users attempting to navigate past the widget.\n**Action:** For ARIA widgets managed via `aria-activedescendant` or roving tabIndex, strictly preserve the `role="option"` on semantically neutral elements (like `<div>` or `<li>`) and manage keyboard interactions through standard container event listeners, avoiding native focusable elements inside the dropdown list.
