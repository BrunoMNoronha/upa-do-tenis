## 2024-05-24 - Testing Intl.DateTimeFormat
**Learning:** Using `Intl.DateTimeFormat` with Vitest can yield different formats across CI environments or local timezones, leading to flaky tests if strict string matching is used.
**Action:** When testing locale-specific output like dates in unit tests without forcing timezone configs, use Regex to match the exact format structure (e.g. `^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$`) rather than specific values to ensure cross-environment reliability.

## 2024-09-08 - Session Cookie Configuration Update
**Vulnerability:** Weak `sameSite` configuration for authentication cookies
**Learning:** The session cookie for Next.js was configured to use `sameSite: "lax"`, which is less restrictive and could potentially be a minor weakness in scenarios where cross-site requests are involved, though mitigated by other strategies.
**Prevention:** Always enforce `sameSite: "strict"` on authentication and session cookies unless cross-site usage is strictly required for the feature (e.g. SSO).

## 2026-09-12 - Respostas seguras na API de clientes
**Aprendizado:** Falhas inesperadas devem produzir resposta JSON genérica, sem expor detalhes internos.
**Ação:** Preservar autenticação e validação, tratar duplicidade com 409 e testar falhas de leitura e criação.

## 2026-10-24 - Prisma Unique Constraint Violations
**Vulnerability:** Information Exposure / Unhandled Error
**Learning:** In Prisma APIs, uniqueness constraint violations (like `P2002`) will by default fall through to standard error handlers (usually returning 500) if not caught. In endpoints handling user input, this exposes internal DB codes or can aid enumeration attacks.
**Prevention:** Explicitly handle `error.code === 'P2002'` across all endpoints that create or update records with unique fields, transforming them into generic `409 Conflict` errors without leaking the internal reason.
