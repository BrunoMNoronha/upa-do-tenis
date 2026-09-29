## 2025-02-28 - Missing session enforcement in API routes
**Vulnerability:** Several API routes relied on manually checking `obterUsuarioSessaoDaRequest` and validating the session state, rather than using the centralized, standard `exigirSessaoApi` middleware. This approach can easily lead to missed authentication checks or inconsistencies across endpoints.
**Learning:** Consistently using the project's standard authentication enforcement function (`exigirSessaoApi`) prevents accidental omissions and ensures a uniform security posture across all private API routes.
**Prevention:** Establish a convention where all private API routes begin with a call to `exigirSessaoApi` and only after that proceed to fetch user details or process the request.
