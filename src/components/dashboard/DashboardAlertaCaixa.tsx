"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { AlertaCaixa } from "@/lib/caixa-alerta";

export type SituacaoAlertaCaixa =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; alerta: AlertaCaixa };

const estiloLink = "text-sm font-medium underline underline-offset-2";

/** Apresentação pura dos estados do alerta de caixa (testável sem fetch). */
export function DashboardAlertaCaixaView({ situacao }: { situacao: SituacaoAlertaCaixa }) {
  if (situacao.tipo === "carregando") {
    return (
      <div
        className="p-4 bg-gray-50 border rounded-lg animate-pulse h-20"
        aria-busy="true"
        aria-label="Verificando estado do caixa"
      />
    );
  }

  if (situacao.tipo === "erro") {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm" role="status">
        <p className="text-gray-700 text-sm">
          Não foi possível verificar o estado do caixa agora.{" "}
          <Link href="/caixa" className={`${estiloLink} text-gray-800`}>
            Ir para o caixa
          </Link>
        </p>
      </div>
    );
  }

  const { alerta } = situacao;

  if (alerta.estado === "FECHAMENTO_PENDENTE") {
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-4 shadow-sm" role="alert">
        <div className="flex items-start">
          <span className="text-xl mr-3 mt-0.5 flex-shrink-0" aria-hidden="true">🚨</span>
          <div className="flex-1">
            <h3 className="text-red-800 font-semibold text-lg mb-1">Fechamento de caixa pendente</h3>
            <p className="text-red-700 text-sm mb-3">
              Há um caixa aberto desde {alerta.dataAbertura} às {alerta.horaAbertura}.
            </p>
            <Link href="/caixa" className={`${estiloLink} text-red-800 hover:text-red-900`}>
              Revisar e fechar caixa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (alerta.estado === "ABERTO_HOJE") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-sm" role="status">
        <div className="flex items-start">
          <span className="text-xl mr-3 mt-0.5 flex-shrink-0" aria-hidden="true">💰</span>
          <div className="flex-1">
            <h3 className="text-emerald-800 font-semibold text-lg mb-1">
              Caixa aberto desde {alerta.horaAbertura}
            </h3>
            <p className="text-emerald-700 text-sm mb-3">
              Lembre-se de realizar o fechamento ao final do expediente.
            </p>
            <Link href="/caixa" className={`${estiloLink} text-emerald-800 hover:text-emerald-900`}>
              Ver caixa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm" role="alert">
      <div className="flex items-start">
        <span className="text-xl mr-3 mt-0.5 flex-shrink-0" aria-hidden="true">🔒</span>
        <div className="flex-1">
          <h3 className="text-amber-800 font-semibold text-lg mb-1">Caixa fechado</h3>
          <p className="text-amber-700 text-sm mb-3">
            Não há caixa aberto para o expediente atual.
          </p>
          <Link href="/caixa" className={`${estiloLink} text-amber-800 hover:text-amber-900`}>
            Abrir caixa
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Alerta operacional de abertura/fechamento do caixa. Busca independente dos
 * filtros de período do Dashboard; apenas informa e leva ao fluxo de /caixa.
 */
export function DashboardAlertaCaixa() {
  const [situacao, setSituacao] = useState<SituacaoAlertaCaixa>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;

    const buscar = async () => {
      try {
        const response = await fetch("/api/caixa/alerta");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const alerta: AlertaCaixa = await response.json();
        if (ativo) setSituacao({ tipo: "pronto", alerta });
      } catch (error) {
        console.error("Erro ao buscar alerta de caixa:", error);
        if (ativo) setSituacao({ tipo: "erro" });
      }
    };

    buscar();
    return () => {
      ativo = false;
    };
  }, []);

  return <DashboardAlertaCaixaView situacao={situacao} />;
}
