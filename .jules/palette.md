## 2023-11-20 — Accessibility in Forms using React Hook Form

**Learning:** Forms utilizing client-side validation libraries like React Hook Form often neglect native programmatic accessibility, leaving error states invisible to screen readers. Inputs lack `aria-invalid` and `aria-describedby` when errors occur, and error messages lack unique `id`s connecting them back to the input. Additionally, form elements miss the `noValidate` attribute, causing browsers to show unstyled native tooltips before the app logic can handle them. Global submit errors also often miss `role="alert"`.

**Action:** Whenever reviewing a form managed by `react-hook-form`, ensure that:
1. The `<form>` tag includes `noValidate` to bypass native browser validation.
2. The `<Input>` or `<select>` tags dynamically receive `aria-invalid={Boolean(errors.fieldName)}`.
3. The `<Input>` or `<select>` tags dynamically receive `aria-describedby={errors.fieldName ? "fieldName-error" : undefined}`.
4. If there's a static hint for the field, include it in the `aria-describedby` as well: `"fieldName-error fieldName-hint"`.
5. Error messages receive the corresponding `id="fieldName-error"`.
6. Error messages explicitly have `role="alert"`.
7. Global submission error messages receive `role="alert"`.
