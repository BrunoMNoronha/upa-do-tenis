import React from "react";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("pt-BR").format(d);
};

export const getTipoLabel = (tipo: string) => {
  const map: Record<string, string> = {
    ENTRADA_MANUAL: "Entrada Manual",
    SAIDA_MANUAL: "Saída Manual",
    AJUSTE: "Ajuste",
    BAIXA_OS: "Baixa em OS",
    ESTORNO_OS: "Estorno de OS",
  };
  return map[tipo] || tipo;
};

export const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case "ENTRADA_MANUAL":
    case "ESTORNO_OS":
      return <span className="mr-1 text-emerald-600">↗️</span>;
    case "SAIDA_MANUAL":
    case "BAIXA_OS":
      return <span className="mr-1 text-rose-600">↘️</span>;
    case "AJUSTE":
      return <span className="mr-1 text-amber-600">🔄</span>;
    default:
      return <span className="mr-1 text-gray-500">📄</span>;
  }
};

export const formatTipoColor = (tipo: string) => {
  switch (tipo) {
    case "ENTRADA_MANUAL":
    case "ESTORNO_OS":
      return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
    case "SAIDA_MANUAL":
    case "BAIXA_OS":
      return "text-rose-700 bg-rose-50 ring-rose-600/20";
    case "AJUSTE":
      return "text-amber-700 bg-amber-50 ring-amber-600/20";
    default:
      return "text-gray-700 bg-gray-50 ring-gray-600/20";
  }
};
