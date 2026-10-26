## 2024-05-24 — Inconsistent Session Enforcement in API Routes

**Vulnerability:** Inconsistent enforcement of server-side sessions on protected API endpoints. Some routes manually verified sessions instead of using the standard `exigirSessaoApi` helper, which can lead to divergent behavior, incomplete checks, or missed security controls as the application evolves.

**Learning:** When multiple approaches exist for verifying authentication, developers might default to a manual implementation that skips standard headers or uniform error handling defined by the core mechanism. In this project, `exigirSessaoApi` should be uniformly used across all private endpoints for consistent 401 responses.

**Prevention:** Ensure all new and modified private API route handlers consistently use `const naoAutenticado = await exigirSessaoApi(req); if (naoAutenticado) return naoAutenticado;` before performing any business logic.
