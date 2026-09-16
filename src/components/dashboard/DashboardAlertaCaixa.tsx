"use client";

import React, { useEffect, useState } from "react";
import type { AlertaCaixa } from "@/lib/caixa-alerta";
import {
  DashboardAlertCard,
  DashboardAlertCardSkeleton,
  IconeCadeado,
  IconeCaixa,
  IconeInfo,
} from "./DashboardAlertCard";

export type SituacaoAlertaCaixa =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; alerta: AlertaCaixa };

/** Apresentação pura dos estados do alerta de caixa (testável sem fetch). */
export function DashboardAlertaCaixaView({ situacao }: { situacao: SituacaoAlertaCaixa }) {
  if (situacao.tipo === "carregando") {
    return <DashboardAlertCardSkeleton label="Verificando estado do caixa" />;
  }

  if (situacao.tipo === "erro") {
    return (
      <DashboardAlertCard
        tone="neutral"
        icon={<IconeInfo />}
        title="Estado do caixa indisponível"
        description="Não foi possível verificar o estado do caixa agora."
        link={{ href: "/caixa", label: "Ir para o caixa" }}
        role="status"
      />
    );
  }

  const { alerta } = situacao;

  if (alerta.estado === "FECHAMENTO_PENDENTE") {
    return (
      <DashboardAlertCard
        tone="danger"
        icon={<IconeCaixa />}
        title="Fechamento de caixa pendente"
        description={`Há um caixa aberto desde ${alerta.dataAbertura} às ${alerta.horaAbertura}.`}
        link={{ href: "/caixa", label: "Revisar e fechar caixa" }}
        role="alert"
      />
    );
  }

  if (alerta.estado === "ABERTO_HOJE") {
    return (
      <DashboardAlertCard
        tone="success"
        icon={<IconeCaixa />}
        title={`Caixa aberto desde ${alerta.horaAbertura}`}
        description="Lembre-se de realizar o fechamento ao final do expediente."
        link={{ href: "/caixa", label: "Ver caixa" }}
        role="status"
      />
    );
  }

  return (
    <DashboardAlertCard
      tone="warning"
      icon={<IconeCadeado />}
      title="Caixa fechado"
      description="Não há caixa aberto para o expediente atual."
      link={{ href: "/caixa", label: "Abrir caixa" }}
      role="alert"
    />
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
