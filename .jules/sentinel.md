## 2024-05-24 - Testing Intl.DateTimeFormat
**Learning:** Using `Intl.DateTimeFormat` with Vitest can yield different formats across CI environments or local timezones, leading to flaky tests if strict string matching is used.
**Action:** When testing locale-specific output like dates in unit tests without forcing timezone configs, use Regex to match the exact format structure (e.g. `^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$`) rather than specific values to ensure cross-environment reliability.
## 2024-05-24 - Information Exposure in API Error Responses
**Vulnerability:** Raw error objects (such as `error.message` from generic Try/Catch blocks) were returned in HTTP 500 responses to the client (e.g. `{ error: "Erro ao gerar o relatório. Detalhes: " + error.message }`).
**Learning:** Developers often append raw internal error messages in catch blocks to help with debugging on the client-side. This practice exposes sensitive internal details such as unhandled Prisma exceptions, query paths, or connection issues, violating the principle of least privilege and information disclosure.
**Prevention:** Differentiate strictly between Internal Logging and Client Responses. Always log the full, raw error on the server side using `console.error()`, but only ever return a safe, generic failure message (e.g., `Ocorreu um erro interno`) in the JSON payload returned to the client.
