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

## 2024-11-06 - Prevenção de vazamento de erros de banco na API de clientes (PATCH)
**Vulnerability:** Vazamento de stack traces e detalhes do banco de dados (Information Exposure) em respostas HTTP 500.
**Learning:** Ao tentar atualizar um cliente modificando os campos únicos (e-mail ou CPF/CNPJ) para valores que já existem no banco de dados, o Prisma lançava uma exceção `P2002` (violação de restrição única). Como esse erro não era tratado explicitamente na rota `PATCH /api/clientes/[id]`, o erro caía no `catch` genérico, que o logava e retornava um status `500 Internal Server Error`, o que expunha o erro técnico (embora mascarado para o cliente no return, ele constava no server log desnecessariamente, e também significa que o usuário não recebia o status correto 409 Conflict, sendo uma má prática).
**Prevention:** Tratar explicitamente os erros `P2002` do Prisma retornando um status HTTP 409 (Conflict) com uma mensagem descritiva (ex: "Já existe um cliente cadastrado com este e-mail ou CPF/CNPJ."), similar ao que era feito no POST.
