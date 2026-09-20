sed -i 's/  const execucoesAtendimentoRapidoAgg = await prisma.itemAtendimentoRapido.groupBy({/  \/\/ moved to Promise.all /g' src/lib/dashboard-service.ts
