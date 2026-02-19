
import { GoogleGenAI, Type } from "@google/genai";
import { CashFlow, ServiceOrder } from "../types";

export const getBusinessInsights = async (orders: ServiceOrder[], transactions: CashFlow[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare data for analysis
  const summary = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => o.status !== 'Entregue').length,
    revenue: transactions.filter(t => t.tipo === 'Receita').reduce((acc, t) => acc + t.valor, 0),
    expenses: transactions.filter(t => t.tipo === 'Despesa').reduce((acc, t) => acc + t.valor, 0),
    topStatus: orders.reduce((acc: any, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {})
  };

  const prompt = `Analise os seguintes dados de uma sapataria (UPA do Tênis) e forneça 3 insights estratégicos curtos (máximo 2 frases cada) para o dono do negócio.
  Dados Atuais:
  - Total de OS: ${summary.totalOrders}
  - OS Ativas: ${summary.activeOrders}
  - Receita Total: R$ ${(summary.revenue / 100).toFixed(2)}
  - Despesas Totais: R$ ${(summary.expenses / 100).toFixed(2)}
  - Status: ${JSON.stringify(summary.topStatus)}
  
  Foque em lucratividade, fluxo de caixa ou retenção de clientes.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return ["Mantenha o controle do seu estoque para não perder vendas.", "Considere promoções para pagamentos via PIX.", "Foque em finalizar as OS em atraso."];
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return ["Erro ao carregar insights inteligentes."];
  }
};