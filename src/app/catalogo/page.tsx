import type { Metadata } from "next";

import { listarProdutosCatalogo, type ProdutoCatalogo } from "@/lib/catalogo-publico";
import {
  obterDadosEmpresaComCache as obterDadosEmpresa,
  obterDadosEmpresaPersistidosComCache as obterDadosEmpresaPersistidos,
} from "@/lib/dados-cache";
import { nomeExibicaoEmpresa } from "@/lib/dados-empresa";

import { CatalogoClient } from "./catalogo-client";

/**
 * Página PÚBLICA do catálogo (#273). Não usa sessão, não passa pela trava de
 * caixa pendente e só recebe a projeção comercial de `catalogo-publico`.
 * O WhatsApp de destino é apenas o configurado pela loja (sem fallback).
 */

export async function generateMetadata(): Promise<Metadata> {
  const dados = await obterDadosEmpresa();
  return {
    title: "Catálogo",
    description: `Produtos de ${nomeExibicaoEmpresa(dados)}. Monte seu pedido e envie pelo WhatsApp.`,
  };
}

// Preço e publicação mudam no painel; nunca servir versão estática/cacheada.
export const dynamic = "force-dynamic";

async function carregarProdutos(): Promise<{ produtos: ProdutoCatalogo[]; erro: boolean }> {
  try {
    return { produtos: await listarProdutosCatalogo(), erro: false };
  } catch (error) {
    console.error("Erro ao carregar o catálogo público.", error);
    return { produtos: [], erro: true };
  }
}

export default async function CatalogoPage() {
  const [{ produtos, erro }, dadosEmpresa, dadosPersistidos] = await Promise.all([
    carregarProdutos(),
    obterDadosEmpresa(),
    obterDadosEmpresaPersistidos(),
  ]);

  return (
    <CatalogoClient
      produtos={produtos}
      erroCarregamento={erro}
      loja={{
        nomeFantasia: dadosEmpresa.nomeFantasia,
        nomeComplementar: dadosEmpresa.nomeComplementar,
        horarioAtendimento: dadosEmpresa.horarioAtendimento,
      }}
      whatsapp={dadosPersistidos?.whatsapp ?? null}
    />
  );
}
