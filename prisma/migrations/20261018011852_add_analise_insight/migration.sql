-- CreateTable
CREATE TABLE "AnaliseInsight" (
    "id" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "periodoInicio" TEXT NOT NULL,
    "periodoFim" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSaida" INTEGER NOT NULL DEFAULT 0,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnaliseInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnaliseInsight_criadoEm_idx" ON "AnaliseInsight"("criadoEm");

-- CreateIndex
CREATE INDEX "AnaliseInsight_usuarioId_idx" ON "AnaliseInsight"("usuarioId");

-- AddForeignKey
ALTER TABLE "AnaliseInsight" ADD CONSTRAINT "AnaliseInsight_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
