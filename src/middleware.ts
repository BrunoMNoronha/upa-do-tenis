import { NextRequest, NextResponse } from "next/server";

import { SESSAO_COOKIE_NOME } from "@/lib/auth-constants";
import { verificarTokenSessaoEdge } from "@/lib/auth-edge";

// Rotas acessíveis sem sessão. Tudo que não estiver aqui exige token válido.
// `/catalogo` é a vitrine pública (#273): sem sessão e indiferente a ela.
const PAGINAS_PUBLICAS = new Set(["/login", "/catalogo"]);
// `/api/saude/migrations` é público para o smoke test pós-promoção; sem sessão
// a própria rota devolve só `ok` e a contagem (#224). `/api/catalogo/produtos`
// só revalida o carrinho com campos comerciais (#273).
const APIS_PUBLICAS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/saude/migrations",
  "/api/catalogo/produtos",
]);

// Página pública de acompanhamento da OS: exatamente um segmento (o token),
// sem subrotas. A autorização é a assinatura do token, validada no servidor
// pela própria página — nunca a sessão administrativa. Token malformado
// (ex.: link truncado) também chega à página e recebe o estado genérico.
const PAGINA_ACOMPANHAMENTO = /^\/acompanhar\/[^/]+$/;

// Imagem comercial do catálogo: a própria rota só responde para produto visível.
const IMAGEM_CATALOGO = /^\/api\/catalogo\/produtos\/[^/]+\/imagem$/;

function ehRotaPublica(pathname: string): boolean {
  return (
    PAGINAS_PUBLICAS.has(pathname) ||
    APIS_PUBLICAS.has(pathname) ||
    PAGINA_ACOMPANHAMENTO.test(pathname) ||
    IMAGEM_CATALOGO.test(pathname)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    (req as unknown as { geo?: { country?: string } }).geo?.country;
  if (country && country !== "BR") {
    return NextResponse.json({ message: "Access Denied" }, { status: 403 });
  }

  if (ehRotaPublica(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSAO_COOKIE_NOME)?.value;
  const sessao = token ? await verificarTokenSessaoEdge(token) : null;

  if (sessao) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Exclui assets do Next e arquivos estáticos; todo o resto passa pelo
  // enforcement de sessão (páginas e APIs).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$).*)"],
};
