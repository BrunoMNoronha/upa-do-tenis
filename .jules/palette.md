## 2024-05-18 - Added loading state to Button component
**Learning:** Adding a native loading state (`isLoading`) to a core UI component (`Button`) improves feedback across the entire application simultaneously. This is highly effective as it prevents multiple manual, inconsistent loading implementations. Wait, I should make this entry according to the guidelines.
**Action:** Always verify if a core UI component supports native loading states. If not, implementing it centrally adds immense value and consistency, specifically by rendering an SVG spinner while retaining the disabled state.

## 2025-02-18 - Combobox options accessibility
**Learning:** Combobox options were implemented as `div` elements with `onClick` handlers, which prevents keyboard navigation using standard focus methods.
**Action:** Replace `div` with `<button type="button">` for dropdown options and ensure focus classes (`focus:ring-2`, `focus:outline-none`, etc.) are included to make them fully keyboard accessible.
