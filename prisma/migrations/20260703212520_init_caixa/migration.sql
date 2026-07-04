-- CreateTable
CREATE TABLE "Caixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataAbertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFechamento" DATETIME,
    "saldoInicial" DECIMAL NOT NULL DEFAULT 0,
    "saldoFinalInformado" DECIMAL,
    "saldoFinalCalculado" DECIMAL,
    "divergencia" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "observacao" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MovimentacaoCaixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caixaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "formaPagamentoId" TEXT,
    "pagamentoId" TEXT,
    "ordemServicoId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentacaoCaixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoCaixa_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "FormaPagamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoCaixa_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoCaixa_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Caixa_status_idx" ON "Caixa"("status");

-- CreateIndex
CREATE INDEX "Caixa_dataAbertura_idx" ON "Caixa"("dataAbertura");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoCaixa_pagamentoId_key" ON "MovimentacaoCaixa"("pagamentoId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_caixaId_idx" ON "MovimentacaoCaixa"("caixaId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_tipo_idx" ON "MovimentacaoCaixa"("tipo");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_origem_idx" ON "MovimentacaoCaixa"("origem");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_pagamentoId_idx" ON "MovimentacaoCaixa"("pagamentoId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_ordemServicoId_idx" ON "MovimentacaoCaixa"("ordemServicoId");
