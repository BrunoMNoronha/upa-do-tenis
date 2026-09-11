## 2024-05-18 - Added loading state to Button component
**Learning:** Adding a native loading state (`isLoading`) to a core UI component (`Button`) improves feedback across the entire application simultaneously. This is highly effective as it prevents multiple manual, inconsistent loading implementations. Wait, I should make this entry according to the guidelines.
**Action:** Always verify if a core UI component supports native loading states. If not, implementing it centrally adds immense value and consistency, specifically by rendering an SVG spinner while retaining the disabled state.
## 2024-05-19 - Use button element for interactive items
**Learning:** Replaced `div` with `button` for combobox options since `div` is not natively focusable. Preserved appearance by retaining the `w-full text-left` classes. This improves keyboard operability.
**Action:** For interactive list/combobox options that use `onClick`, always default to using `<button type="button">` instead of `<div>`. Ensure that layout attributes are kept to maintain visually identical blocks.
