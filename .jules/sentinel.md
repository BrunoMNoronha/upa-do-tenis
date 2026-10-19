## 2025-02-12 — Inconsistent API Auth Enforcement

**Vulnerability:** Private API routes under `src/app/api/assistente/conversas/` verified user sessions manually using `obterUsuarioSessaoDaRequest`, bypassing the standard `exigirSessaoApi` helper.

**Learning:** This occurs when new feature routes (like AI assistant endpoints) copy basic session retrieval logic but omit the centralized enforcement middleware, creating a gap where standard authorization policies (e.g., active user checks, uniform 401 responses) are not applied.

**Prevention:** Always use the dedicated authorization enforcement helper (`exigirSessaoApi`) first on all private API endpoints. If the user object is needed, retrieve it afterward (`obterUsuarioSessaoDaRequest`). Ensure new routes are consistently audited against existing auth patterns.
