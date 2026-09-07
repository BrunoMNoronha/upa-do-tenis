import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regressão de segurança: antes desta guarda, as páginas privadas eram
 * renderizadas no servidor (com dados de clientes, caixa, vendas e
 * financeiro) confiando apenas no middleware. Qualquer requisição que não
 * passasse pelo middleware — matcher, rewrite, bug de borda do runtime Edge —
 * entregaria os dados sem sessão. O enforcement precisa existir também no
 * componente de servidor.
 */

const RAIZ_APP = path.resolve(__dirname);

// /login é pública por definição e faz o inverso: redireciona quem JÁ tem sessão.
const PAGINAS_PUBLICAS = new Set([path.join("login", "page.tsx")]);

function listarPaginas(diretorio: string): string[] {
  const encontradas: string[] = [];

  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = path.join(diretorio, entrada.name);

    if (entrada.isDirectory()) {
      if (entrada.name === "api") continue;
      encontradas.push(...listarPaginas(caminho));
    } else if (entrada.name === "page.tsx") {
      encontradas.push(caminho);
    }
  }

  return encontradas;
}

const paginas = listarPaginas(RAIZ_APP)
  .map((caminho) => path.relative(RAIZ_APP, caminho))
  .filter((relativo) => !PAGINAS_PUBLICAS.has(relativo))
  .sort();

describe("enforcement de sessão nas páginas privadas", () => {
  it("encontra as páginas privadas do app", () => {
    expect(paginas.length).toBeGreaterThan(0);
  });

  it.each(paginas)("%s exige sessão no servidor", (relativo) => {
    const conteudo = readFileSync(path.join(RAIZ_APP, relativo), "utf8");

    expect(conteudo).toMatch(/from "@\/lib\/auth-server"/);
    expect(conteudo).toMatch(/await exigirSessao\(\)/);
  });

  it.each(paginas)("%s não é renderizada estaticamente", (relativo) => {
    const conteudo = readFileSync(path.join(RAIZ_APP, relativo), "utf8");

    expect(conteudo).toMatch(/export const dynamic\s*=\s*"force-dynamic"/);
  });
});
