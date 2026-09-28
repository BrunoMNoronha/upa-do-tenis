## 2024-05-01 - Missing server-side guard on order creation

**Vulnerability:** A private API endpoint for order creation (`POST /api/ordens-servico`) only validated the session manually using `obterUsuarioSessaoDaRequest` and failed to apply the established `exigirSessaoApi` helper.

**Learning:** When adding multiple authentication layers or complex logic to an API route, standard security helpers can easily be missed or omitted in favor of manual checks if not rigorously reviewed.

**Prevention:** Ensure that all private route handlers systematically start with the established `exigirSessaoApi` helper before extracting user data or executing any other logic.
