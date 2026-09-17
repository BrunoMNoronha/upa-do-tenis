-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "atendimentoRapidoId" TEXT,
ALTER COLUMN "ordemServicoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MovimentacaoCaixa" ADD COLUMN     "atendimentoRapidoId" TEXT;

-- CreateTable
CREATE TABLE "AtendimentoRapido" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorTotal" DECIMAL(65,30) NOT NULL,
    "observacoes" TEXT,
    "chaveIdempotencia" TEXT NOT NULL,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtendimentoRapido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAtendimentoRapido" (
    "id" TEXT NOT NULL,
    "atendimentoRapidoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemAtendimentoRapido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtendimentoRapido_codigo_key" ON "AtendimentoRapido"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AtendimentoRapido_chaveIdempotencia_key" ON "AtendimentoRapido"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "AtendimentoRapido_dataHora_idx" ON "AtendimentoRapido"("dataHora");

-- CreateIndex
CREATE INDEX "AtendimentoRapido_criadoPorId_idx" ON "AtendimentoRapido"("criadoPorId");

-- CreateIndex
CREATE INDEX "ItemAtendimentoRapido_atendimentoRapidoId_idx" ON "ItemAtendimentoRapido"("atendimentoRapidoId");

-- CreateIndex
CREATE INDEX "ItemAtendimentoRapido_servicoId_idx" ON "ItemAtendimentoRapido"("servicoId");

-- CreateIndex
CREATE INDEX "Pagamento_atendimentoRapidoId_idx" ON "Pagamento"("atendimentoRapidoId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_atendimentoRapidoId_idx" ON "MovimentacaoCaixa"("atendimentoRapidoId");

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_atendimentoRapidoId_fkey" FOREIGN KEY ("atendimentoRapidoId") REFERENCES "AtendimentoRapido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoRapido" ADD CONSTRAINT "AtendimentoRapido_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAtendimentoRapido" ADD CONSTRAINT "ItemAtendimentoRapido_atendimentoRapidoId_fkey" FOREIGN KEY ("atendimentoRapidoId") REFERENCES "AtendimentoRapido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAtendimentoRapido" ADD CONSTRAINT "ItemAtendimentoRapido_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_atendimentoRapidoId_fkey" FOREIGN KEY ("atendimentoRapidoId") REFERENCES "AtendimentoRapido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- SQL manual (o Prisma não modela CHECK constraints).
-- ---------------------------------------------------------------------------

-- Cada Pagamento tem exatamente uma origem: Ordem de Serviço XOR Atendimento
-- Rápido. Todos os pagamentos existentes têm ordemServicoId preenchido e
-- atendimentoRapidoId nulo (coluna recém-criada), então a validação passa sem
-- reescrever dados.
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_origem_exclusiva_check"
  CHECK (num_nonnulls("ordemServicoId", "atendimentoRapidoId") = 1);

-- Formato do código gerado no backend: AR-DDMMAAAA-NNNN.
ALTER TABLE "AtendimentoRapido" ADD CONSTRAINT "AtendimentoRapido_codigo_formato_check"
  CHECK ("codigo" ~ '^AR-[0-9]{8}-[0-9]{4}$');

-- Atendimento Rápido não tem valor zero nem negativo.
ALTER TABLE "AtendimentoRapido" ADD CONSTRAINT "AtendimentoRapido_valorTotal_positivo_check"
  CHECK ("valorTotal" > 0);

-- Itens: preço praticado positivo.
ALTER TABLE "ItemAtendimentoRapido" ADD CONSTRAINT "ItemAtendimentoRapido_valor_positivo_check"
  CHECK ("valor" > 0);
