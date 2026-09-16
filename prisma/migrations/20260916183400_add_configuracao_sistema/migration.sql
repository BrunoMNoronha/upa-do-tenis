-- CreateTable
CREATE TABLE "ConfiguracaoSistema" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoSistema_pkey" PRIMARY KEY ("chave")
);
