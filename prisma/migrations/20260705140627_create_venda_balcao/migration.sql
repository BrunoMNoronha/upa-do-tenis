-- AlterTable
ALTER TABLE "MovimentacaoCaixa" ADD COLUMN     "vendaId" TEXT;

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "quantidadeEstoque" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONCLUIDA',
    "valorTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "formaPagamentoId" TEXT NOT NULL,
    "dataVenda" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "precoUnitario" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "precoTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoqueProduto" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldoAnterior" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldoPosterior" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "origem" TEXT NOT NULL,
    "vendaId" TEXT,
    "itemVendaId" TEXT,
    "observacao" TEXT,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoqueProduto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venda_numero_key" ON "Venda"("numero");

-- CreateIndex
CREATE INDEX "Venda_numero_idx" ON "Venda"("numero");

-- CreateIndex
CREATE INDEX "Venda_status_idx" ON "Venda"("status");

-- CreateIndex
CREATE INDEX "Venda_clienteId_idx" ON "Venda"("clienteId");

-- CreateIndex
CREATE INDEX "Venda_dataVenda_idx" ON "Venda"("dataVenda");

-- CreateIndex
CREATE INDEX "ItemVenda_vendaId_idx" ON "ItemVenda"("vendaId");

-- CreateIndex
CREATE INDEX "ItemVenda_produtoId_idx" ON "ItemVenda"("produtoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueProduto_produtoId_idx" ON "MovimentacaoEstoqueProduto"("produtoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueProduto_tipo_idx" ON "MovimentacaoEstoqueProduto"("tipo");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueProduto_origem_idx" ON "MovimentacaoEstoqueProduto"("origem");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueProduto_criadoEm_idx" ON "MovimentacaoEstoqueProduto"("criadoEm");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueProduto_vendaId_idx" ON "MovimentacaoEstoqueProduto"("vendaId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_vendaId_idx" ON "MovimentacaoCaixa"("vendaId");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "FormaPagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoqueProduto" ADD CONSTRAINT "MovimentacaoEstoqueProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoqueProduto" ADD CONSTRAINT "MovimentacaoEstoqueProduto_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
