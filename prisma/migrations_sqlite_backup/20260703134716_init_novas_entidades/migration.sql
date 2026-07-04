/*
  Warnings:

  - You are about to drop the column `formaPagamento` on the `Pagamento` table. All the data in the column will be lost.
  - Added the required column `formaPagamentoId` to the `Pagamento` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "FormaPagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidadeMedida" TEXT NOT NULL,
    "quantidadeEstoque" DECIMAL NOT NULL DEFAULT 0,
    "estoqueMinimo" DECIMAL NOT NULL DEFAULT 0,
    "custoUnitario" DECIMAL NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordemServicoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL DEFAULT 0,
    "formaPagamentoId" TEXT NOT NULL,
    "dataPagamento" DATETIME NOT NULL,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pagamento_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pagamento_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "FormaPagamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pagamento" ("criadoEm", "dataPagamento", "id", "observacoes", "ordemServicoId", "tipo", "valor") SELECT "criadoEm", "dataPagamento", "id", "observacoes", "ordemServicoId", "tipo", "valor" FROM "Pagamento";
DROP TABLE "Pagamento";
ALTER TABLE "new_Pagamento" RENAME TO "Pagamento";
CREATE INDEX "Pagamento_ordemServicoId_idx" ON "Pagamento"("ordemServicoId");
CREATE INDEX "Pagamento_formaPagamentoId_idx" ON "Pagamento"("formaPagamentoId");
CREATE INDEX "Pagamento_tipo_idx" ON "Pagamento"("tipo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FormaPagamento_nome_idx" ON "FormaPagamento"("nome");

-- CreateIndex
CREATE INDEX "FormaPagamento_ativo_idx" ON "FormaPagamento"("ativo");

-- CreateIndex
CREATE INDEX "Insumo_nome_idx" ON "Insumo"("nome");

-- CreateIndex
CREATE INDEX "Insumo_ativo_idx" ON "Insumo"("ativo");
