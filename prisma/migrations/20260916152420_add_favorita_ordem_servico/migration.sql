-- AlterTable
ALTER TABLE "OrdemServico" ADD COLUMN     "favorita" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "OrdemServico_favorita_idx" ON "OrdemServico"("favorita");
