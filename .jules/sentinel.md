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

## 2024-05-28 - Missing Server-Side Access Control on Ordens Servico POST

**Vulnerability:** A private API route (`POST /api/ordens-servico`) lacked the standard server-side authorization guard, relying solely on extracting the user from the request.

**Learning:** When creating new routes, manual checks for session presence can be implemented but they might bypass the standardized mechanism that rejects unauthorized requests uniformly.

**Prevention:** Always use the standard `exigirSessaoApi` helper at the very beginning of private API routes to guarantee consistent enforcement of access controls before any other logic is executed.
