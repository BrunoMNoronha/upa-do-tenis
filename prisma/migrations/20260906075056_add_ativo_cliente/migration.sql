-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Cliente_ativo_idx" ON "Cliente"("ativo");
