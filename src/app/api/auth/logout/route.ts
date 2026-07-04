import { NextResponse } from "next/server";

import { SESSAO_COOKIE_NOME } from "@/lib/auth-session";

export async function POST() {
  const response = NextResponse.json({ message: "Sessão encerrada." }, { status: 200 });

  response.cookies.set(SESSAO_COOKIE_NOME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
