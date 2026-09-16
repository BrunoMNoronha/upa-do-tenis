"use client";

import React, { useEffect, useState } from "react";
import {
  DashboardAlertCard,
  DashboardAlertCardSkeleton,
  IconeAlerta,
  IconeEstoque,
  IconeInfo,
} from "./DashboardAlertCard";

export interface AlertasEstoque {
  totalInsumosZerados: number;
  totalInsumosAbaixoMinimo: number;
  totalCriticos: number;
}

export type SituacaoAlertasEstoque =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; alertas: AlertasEstoque };

function plural(quantidade: number, singular: string, pluralForma: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : pluralForma}`;
}

/**
 * Descrição com as contagens reais do contrato (o endpoint não devolve os
 * nomes dos insumos críticos, então nada de listas fictícias).
 */
export function descreverAlertasEstoque(alertas: AlertasEstoque): string {
  const partes: string[] = [];
  if (alertas.totalInsumosZerados > 0) {
    partes.push(plural(alertas.totalInsumosZerados, "insumo zerado", "insumos zerados"));
  }
  if (alertas.totalInsumosAbaixoMinimo > 0) {
    partes.push(plural(alertas.totalInsumosAbaixoMinimo, "insumo abaixo do mínimo", "insumos abaixo do mínimo"));
  }
  return partes.join(" · ");
}

/** Apresentação pura dos estados do alerta de estoque (testável sem fetch). */
export function DashboardAlertasEstoqueView({ situacao }: { situacao: SituacaoAlertasEstoque }) {
  if (situacao.tipo === "carregando") {
    return <DashboardAlertCardSkeleton label="Verificando alertas de estoque" />;
  }

  if (situacao.tipo === "erro") {
    return (
      <DashboardAlertCard
        tone="neutral"
        icon={<IconeInfo />}
        title="Alertas de estoque indisponíveis"
        description="Não foi possível verificar o estoque agora."
        link={{ href: "/insumos", label: "Ver estoque" }}
        role="status"
      />
    );
  }

  const { alertas } = situacao;

  if (alertas.totalCriticos === 0) {
    return (
      <DashboardAlertCard
        tone="success"
        icon={<IconeEstoque />}
        title="Estoque sem alertas críticos"
        description="Nenhum insumo zerado ou abaixo do mínimo."
        link={{ href: "/insumos", label: "Ver estoque" }}
        role="status"
      />
    );
  }

  const zerados = alertas.totalInsumosZerados > 0;

  return (
    <DashboardAlertCard
      tone={zerados ? "danger" : "warning"}
      icon={<IconeAlerta />}
      title={plural(alertas.totalCriticos, "insumo precisa de atenção", "insumos precisam de atenção")}
      description={descreverAlertasEstoque(alertas)}
      link={{ href: "/insumos?estoqueBaixo=true", label: "Ver estoque baixo" }}
      role="alert"
    />
  );
}

export function DashboardAlertasEstoque() {
  const [situacao, setSituacao] = useState<SituacaoAlertasEstoque>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;

    const buscar = async () => {
      try {
        const response = await fetch("/api/relatorios/estoque/alertas");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const alertas: AlertasEstoque = await response.json();
        if (ativo) setSituacao({ tipo: "pronto", alertas });
      } catch (error) {
        console.error("Erro ao buscar alertas de estoque:", error);
        if (ativo) setSituacao({ tipo: "erro" });
      }
    };

    buscar();
    return () => {
      ativo = false;
    };
  }, []);

  return <DashboardAlertasEstoqueView situacao={situacao} />;
}
