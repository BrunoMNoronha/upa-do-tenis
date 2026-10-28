# 🛡️ Sentinel Security Report

## Verdict
PR CREATED

## Severity
MEDIUM

## Category
Information Exposure

## Finding
When attempting to update a client via `PATCH /api/clientes/[id]` and submitting an email or CPF/CNPJ that is already taken by another client, the application failed to explicitly catch Prisma's unique constraint violation error (`P2002`). This caused the error to fall through to the generic catch block, which logged the internal database exception details and erroneously returned a generic 500 Internal Server Error, masking the expected 409 Conflict status.

## Evidence
The issue was identified by inspecting `src/app/api/clientes/[id]/route.ts`. The error handling block explicitly checked for `P2025` (Record to update not found) but lacked a check for `P2002` (Unique constraint failed), unlike the `POST` route in `src/app/api/clientes/route.ts` where it was correctly handled.

## Security impact
Exposing internal database error codes and traces in server logs for routine validation failures (like duplicate emails) pollutes logs and can potentially expose database schema or structure details unnecessarily (Information Exposure). Furthermore, returning a 500 instead of a 409 breaks the expected API contract, potentially causing frontend clients to mishandle the error.

## Fix
Updated `src/app/api/clientes/[id]/route.ts` to explicitly handle the `P2002` Prisma error code inside the `catch` block. It now returns a `409 Conflict` status code with a safe, generic message: `"Já existe um cliente cadastrado com este e-mail ou CPF/CNPJ."`, preventing the error from being logged as an internal server failure.

## Files changed
- `src/app/api/clientes/[id]/route.ts`
- `src/app/api/clientes/[id]/clientes-crud.test.ts`
- `.jules/sentinel.md`

## Validation
| Check | Result |
|---|---|
| lint | PASSED |
| tests | PASSED |
| targeted security test | PASSED |
| build | PASSED |
| diff review | PASSED |

## Regression protection
Added a specific unit test `it("retorna 409 para duplicidade de email ou CPF/CNPJ (P2002) sem expor detalhes", async () => { ... })` in `src/app/api/clientes/[id]/clientes-crud.test.ts` to ensure the correct behavior and status code is maintained.

## Remaining risks
None identified related to this fix.

## Pull Request
[PR will be created upon submission]

## Disclosure
public-safe

## Journal
entry added
