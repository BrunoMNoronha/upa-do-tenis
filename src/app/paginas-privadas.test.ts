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
// /acompanhar/[token] é a página pública do cliente: autoriza pela assinatura
// do token (coberto em os-acompanhamento*.test.ts), nunca pela sessão.
const PAGINA_ACOMPANHAMENTO = path.join("acompanhar", "[token]", "page.tsx");
// /catalogo é a vitrine pública (#273): só a projeção comercial, sem sessão.
const PAGINA_CATALOGO = path.join("catalogo", "page.tsx");
const PAGINAS_PUBLICAS = new Set([path.join("login", "page.tsx"), PAGINA_ACOMPANHAMENTO, PAGINA_CATALOGO]);

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

describe("página pública de acompanhamento da OS", () => {
  const conteudo = () => readFileSync(path.join(RAIZ_APP, PAGINA_ACOMPANHAMENTO), "utf8");

  it("valida o token no servidor e não é renderizada estaticamente", () => {
    expect(conteudo()).toMatch(/obterAcompanhamentoPublico\(token\)/);
    expect(conteudo()).toMatch(/export const dynamic\s*=\s*"force-dynamic"/);
  });

  it("não depende da sessão administrativa nem consulta o Prisma diretamente", () => {
    expect(conteudo()).not.toMatch(/auth-server|@\/lib\/prisma/);
  });
});

describe("página pública do catálogo", () => {
  const conteudo = () => readFileSync(path.join(RAIZ_APP, PAGINA_CATALOGO), "utf8");

  it("usa só a projeção pública e não é renderizada estaticamente", () => {
    expect(conteudo()).toMatch(/from "@\/lib\/catalogo-publico"/);
    expect(conteudo()).toMatch(/export const dynamic\s*=\s*"force-dynamic"/);
  });

  it("não depende da sessão administrativa nem consulta o Prisma diretamente", () => {
    expect(conteudo()).not.toMatch(/auth-server|@\/lib\/prisma|exigirSessao/);
  });

  it("usa só o WhatsApp persistido, sem o fallback institucional", () => {
    expect(conteudo()).toContain("whatsapp={dadosPersistidos?.whatsapp ?? null}");
    expect(conteudo()).not.toMatch(/dadosEmpresa\.whatsapp|DADOS_EMPRESA_PADRAO/);
  });
});

describe("enforcement de sessão nas páginas privadas", () => {
  it("encontra as páginas privadas do app", () => {
    expect(paginas.length).toBeGreaterThan(0);
  });

  it.each(paginas)("%s exige sessão no servidor", (relativo) => {
    const conteudo = readFileSync(path.join(RAIZ_APP, relativo), "utf8");

    expect(conteudo).toMatch(/from "@\/lib\/auth-server"/);
    if (relativo === path.join("caixa", "page.tsx")) {
      expect(conteudo).toMatch(/await exigirSessao\(\{ permitirFechamento: true \}\)/);
    } else {
      expect(conteudo).toMatch(/await exigirSessao\(\)/);
      expect(conteudo).not.toContain("permitirFechamento");
    }
  });

  it.each(paginas)("%s não é renderizada estaticamente", (relativo) => {
    const conteudo = readFileSync(path.join(RAIZ_APP, relativo), "utf8");

    expect(conteudo).toMatch(/export const dynamic\s*=\s*"force-dynamic"/);
  });
});
