-- CreateTable
CREATE TABLE "MovimentacaoEstoqueInsumo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "insumoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" DECIMAL NOT NULL DEFAULT 0,
    "custoUnitario" DECIMAL NOT NULL DEFAULT 0,
    "custoTotal" DECIMAL NOT NULL DEFAULT 0,
    "saldoAnterior" DECIMAL NOT NULL DEFAULT 0,
    "saldoPosterior" DECIMAL NOT NULL DEFAULT 0,
    "origem" TEXT NOT NULL,
    "ordemServicoId" TEXT,
    "itemOrdemServicoId" TEXT,
    "observacao" TEXT,
    "motivo" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentacaoEstoqueInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoEstoqueInsumo_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoEstoqueInsumo_itemOrdemServicoId_fkey" FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_insumoId_idx" ON "MovimentacaoEstoqueInsumo"("insumoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_tipo_idx" ON "MovimentacaoEstoqueInsumo"("tipo");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_origem_idx" ON "MovimentacaoEstoqueInsumo"("origem");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_criadoEm_idx" ON "MovimentacaoEstoqueInsumo"("criadoEm");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_ordemServicoId_idx" ON "MovimentacaoEstoqueInsumo"("ordemServicoId");
