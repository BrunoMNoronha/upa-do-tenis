## 2024-05-18 - Added loading state to Button component
**Learning:** Adding a native loading state (`isLoading`) to a core UI component (`Button`) improves feedback across the entire application simultaneously. This is highly effective as it prevents multiple manual, inconsistent loading implementations. Wait, I should make this entry according to the guidelines.
**Action:** Always verify if a core UI component supports native loading states. If not, implementing it centrally adds immense value and consistency, specifically by rendering an SVG spinner while retaining the disabled state.

## 2025-03-08 - Accessible Combobox Keyboard Support
**Learning:** Comboboxes require specific ARIA attributes (`role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`) and full keyboard support (Up, Down, Enter, Esc) to be accessible. Standard `<div>` wrapping an input lacks this capability by default.
**Action:** When creating or modifying complex interactive components like Combobox, always implement standard keyboard navigation and ARIA roles for screen reader and keyboard-only users.
