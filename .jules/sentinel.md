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
## 2025-02-28 - Insecure Randomness in Business Identifiers
**Vulnerability:** Uso de gerador de números pseudoaleatórios não criptográfico (`Math.random()`) para geração de números de ordens de serviço.
**Learning:** A previsibilidade dos números gerados por `Math.random()` pode permitir a enumeração e previsão de identificadores de negócio, facilitando ataques como Insecure Direct Object References (IDOR).
**Prevention:** Sempre utilizar funções criptograficamente seguras, como as fornecidas pelo módulo `crypto` do Node.js (ex: `crypto.randomInt`), para a geração de identificadores, sufixos, tokens ou senhas.
