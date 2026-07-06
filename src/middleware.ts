import { NextRequest, NextResponse } from "next/server";

import { SESSAO_COOKIE_NOME } from "@/lib/auth-constants";
import { verificarTokenSessaoEdge } from "@/lib/auth-edge";

// Rotas acessíveis sem sessão. Tudo que não estiver aqui exige token válido.
const PAGINAS_PUBLICAS = new Set(["/login"]);
const APIS_PUBLICAS = new Set(["/api/auth/login", "/api/auth/logout"]);

function ehRotaPublica(pathname: string): boolean {
  return PAGINAS_PUBLICAS.has(pathname) || APIS_PUBLICAS.has(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
