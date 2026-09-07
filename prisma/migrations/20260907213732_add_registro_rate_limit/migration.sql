-- CreateTable
CREATE TABLE "RegistroRateLimit" (
    "chave" TEXT NOT NULL,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "ultimaFalhaEm" TIMESTAMP(3) NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroRateLimit_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "RegistroRateLimit_expiraEm_idx" ON "RegistroRateLimit"("expiraEm");
