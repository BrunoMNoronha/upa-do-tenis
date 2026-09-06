
## 2026-07-07 - Remoção do segredo de sessão padrão em desenvolvimento

**Vulnerabilidade:** O código continha um segredo de sessão HMAC padrão ("upa-do-tenis-segredo-dev") para ambientes de não-produção (`src/lib/auth-constants.ts`), abrindo margem para falsificação de cookies de sessão em staging, dev ou preview expostos se `AUTH_SESSION_SECRET` não estivesse configurado.
**Aprendizado:** Fallbacks com chaves estáticas em código fonte, mesmo sob condições de `NODE_ENV !== "production"`, representam um risco de segurança relevante em ambientes de homologação ou pré-produção.
**Prevenção:** Exigir obrigatoriamente a variável de ambiente `AUTH_SESSION_SECRET` (mínimo 16 caracteres) em todos os ambientes e lançar erro imediato se a configuração estiver ausente ou for fraca.
