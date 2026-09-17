-- Estorno de pagamentos de OS (#230, fatia 1). Migration aditiva: tabela nova e
-- coluna opcional em MovimentacaoCaixa, sem backfill e sem alterar dados
-- existentes. Compatível com a versão anterior da aplicação.
-- AlterTable
ALTER TABLE "MovimentacaoCaixa" ADD COLUMN     "estornoPagamentoId" TEXT;

-- CreateTable
CREATE TABLE "EstornoPagamento" (
    "id" TEXT NOT NULL,
    "pagamentoId" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "dataEstorno" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstornoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstornoPagamento_pagamentoId_key" ON "EstornoPagamento"("pagamentoId");

-- CreateIndex
CREATE INDEX "EstornoPagamento_dataEstorno_idx" ON "EstornoPagamento"("dataEstorno");

-- CreateIndex
CREATE INDEX "EstornoPagamento_usuarioId_idx" ON "EstornoPagamento"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoCaixa_estornoPagamentoId_key" ON "MovimentacaoCaixa"("estornoPagamentoId");

-- AddForeignKey
ALTER TABLE "EstornoPagamento" ADD CONSTRAINT "EstornoPagamento_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstornoPagamento" ADD CONSTRAINT "EstornoPagamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_estornoPagamentoId_fkey" FOREIGN KEY ("estornoPagamentoId") REFERENCES "EstornoPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

