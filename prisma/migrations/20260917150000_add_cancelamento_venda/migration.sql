-- Cancelamento total de venda de balcão. Migration aditiva: três colunas
-- opcionais em Venda, sem backfill e sem alterar dados existentes. Compatível
-- com a versão anterior da aplicação.
-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "canceladoPorId" TEXT,
ADD COLUMN     "dataCancelamento" TIMESTAMP(3),
ADD COLUMN     "motivoCancelamento" TEXT;

-- CreateIndex
CREATE INDEX "Venda_canceladoPorId_idx" ON "Venda"("canceladoPorId");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- SQL manual (o Prisma não modela CHECK constraints).
-- ---------------------------------------------------------------------------

-- Venda cancelada tem data, motivo e usuário do cancelamento; venda não
-- cancelada não tem nenhum deles. Todas as vendas existentes são CONCLUIDA
-- com as colunas novas nulas, então a validação passa sem reescrever dados.
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_cancelamento_consistente_check"
  CHECK (
    ("status" = 'CANCELADA') = (
      "dataCancelamento" IS NOT NULL
      AND "motivoCancelamento" IS NOT NULL
      AND "canceladoPorId" IS NOT NULL
    )
    AND ("status" = 'CANCELADA' OR num_nonnulls("dataCancelamento", "motivoCancelamento", "canceladoPorId") = 0)
  );
