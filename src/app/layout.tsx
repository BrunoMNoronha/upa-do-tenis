import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { obterDadosEmpresa } from "@/lib/configuracoes";
import { nomeExibicaoEmpresa } from "@/lib/dados-empresa";

// Fonte da interface. A variável CSS é consumida em globals.css (--font-sans),
// com fallback para as fontes de sistema já usadas antes.
const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const dados = await obterDadosEmpresa();
  return {
    title: { default: nomeExibicaoEmpresa(dados), template: `%s | ${nomeExibicaoEmpresa(dados)}` },
    description: "Sistema web interno para controle de clientes, ordens de serviço e produção.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
