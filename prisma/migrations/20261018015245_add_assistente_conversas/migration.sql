-- CreateTable
CREATE TABLE "ConversaAssistente" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversaAssistente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemAssistente" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "papel" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "modelo" TEXT,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSaida" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemAssistente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversaAssistente_usuarioId_atualizadoEm_idx" ON "ConversaAssistente"("usuarioId", "atualizadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "MensagemAssistente_conversaId_ordem_key" ON "MensagemAssistente"("conversaId", "ordem");

-- AddForeignKey
ALTER TABLE "ConversaAssistente" ADD CONSTRAINT "ConversaAssistente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemAssistente" ADD CONSTRAINT "MensagemAssistente_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "ConversaAssistente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
