// Constantes e acesso ao segredo da sessão compartilhados entre o runtime
// Node (route handlers) e o runtime Edge (middleware). Este módulo não pode
// importar "crypto" nem qualquer API exclusiva do Node.
export const SESSAO_COOKIE_NOME = "upa_sessao";
export const SESSAO_DURACAO_SEGUNDOS = 8 * 60 * 60;

export function obterSegredoSessao(): string {
  const segredo = process.env.AUTH_SESSION_SECRET;

  if (segredo && segredo.length >= 16) {
    return segredo;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SESSION_SECRET não configurado. Defina uma chave com pelo menos 16 caracteres."
    );
  }

  return "upa-do-tenis-segredo-dev";
}
