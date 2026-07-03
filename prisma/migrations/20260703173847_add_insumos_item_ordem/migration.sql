-- CreateTable
CREATE TABLE "InsumoItemOrdem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemOrdemServicoId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantidade" DECIMAL NOT NULL DEFAULT 0,
    "custoUnitarioAplicado" DECIMAL NOT NULL DEFAULT 0,
    "custoTotalAplicado" DECIMAL NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "InsumoItemOrdem_itemOrdemServicoId_fkey" FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsumoItemOrdem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InsumoItemOrdem_itemOrdemServicoId_idx" ON "InsumoItemOrdem"("itemOrdemServicoId");

-- CreateIndex
CREATE INDEX "InsumoItemOrdem_insumoId_idx" ON "InsumoItemOrdem"("insumoId");
