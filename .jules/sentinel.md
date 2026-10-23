## 2025-02-21 — Inconsistent authentication guard across assistant API routes

**Vulnerability:** Authorization implementation inconsistency. Certain private endpoints (`/api/assistente/conversas/*`) relied exclusively on `obterUsuarioSessaoDaRequest(req)` checking for a truthy user value, ignoring the standard central validation middleware `exigirSessaoApi(req)`.

**Learning:** When API endpoints are developed rapidly, developers might bypass the standardized session guard if their immediate need is simply to extract the user object. This fragments authentication logic and creates drift, meaning future global security checks added to `exigirSessaoApi` will quietly fail to protect these rogue routes.

**Prevention:** Enforce the usage pattern of invoking `exigirSessaoApi` for access enforcement *before* unwrapping the user data via `obterUsuarioSessaoDaRequest`, rather than using the latter as an enforcement mechanism.
