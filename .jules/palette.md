## 2024-05-18 - Added loading state to Button component
**Learning:** Adding a native loading state (`isLoading`) to a core UI component (`Button`) improves feedback across the entire application simultaneously. This is highly effective as it prevents multiple manual, inconsistent loading implementations. Wait, I should make this entry according to the guidelines.
**Action:** Always verify if a core UI component supports native loading states. If not, implementing it centrally adds immense value and consistency, specifically by rendering an SVG spinner while retaining the disabled state.

## 2025-03-08 - Accessible Combobox Keyboard Support
**Learning:** Comboboxes require specific ARIA attributes (`role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`) and full keyboard support (Up, Down, Enter, Esc) to be accessible. Standard `<div>` wrapping an input lacks this capability by default.
**Action:** When creating or modifying complex interactive components like Combobox, always implement standard keyboard navigation and ARIA roles for screen reader and keyboard-only users.

## 2026-09-12 - Rótulos associados no seletor de datas
**Aprendizado:** useId permite associar rótulos e campos sem duplicar IDs entre instâncias.
**Ação:** Preservar o indicador de foco vigente e vincular cada Label ao Input correspondente.

## 2025-03-09 - Accessible Combobox Options (Keyboard Focus)
**Learning:** Native `<button type="button">` should always be preferred over `<div>` for interactive list options (like in Combobox or Dropdowns) to ensure they are naturally focusable and can be activated via standard keyboard events (Enter, Space), avoiding complex and manual `onKeyDown` setups for ARIA compliance.
**Action:** When converting `<div>` to `<button>` in lists, always add `w-full text-left` to maintain the block-like appearance and text alignment, preventing visual regressions while gaining accessibility.
