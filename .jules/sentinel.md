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
## 2024-03-24 - Atualização de cliente

**Vulnerability:** Information Exposure (Erro 500 em violação de restrição única)

**Learning:** Ao atualizar um cliente com um e-mail ou CPF/CNPJ já existente na base, o Prisma lança um erro com código P2002. Sem o devido tratamento na rota PATCH, isso causa um erro 500 que, além de prejudicar a experiência, vaza logs no console.

**Prevention:** Adicionar tratamento específico para o código P2002 em rotas de atualização, retornando status 409 (Conflict) e ocultando os detalhes do banco de dados na resposta da API.
