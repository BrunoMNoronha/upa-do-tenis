-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "cpfCnpj" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemServico" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "dataPrevisao" TIMESTAMP(3) NOT NULL,
    "dataConclusao" TIMESTAMP(3),
    "valorTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorSinal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "justificativaInicioSemAprovacao" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrdemServico" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "tipoItem" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "marca" TEXT,
    "cor" TEXT,
    "tamanho" TEXT,
    "observacoes" TEXT,
    "valor" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemOrdemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoBase" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicoItemOrdem" (
    "id" TEXT NOT NULL,
    "itemOrdemServicoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicoItemOrdem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaPagamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormaPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "formaPagamentoId" TEXT NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoStatus" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidadeMedida" TEXT NOT NULL,
    "quantidadeEstoque" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estoqueMinimo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "custoUnitario" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsumoItemOrdem" (
    "id" TEXT NOT NULL,
    "itemOrdemServicoId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantidade" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "custoUnitarioAplicado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "custoTotalAplicado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsumoItemOrdem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoqueInsumo" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "custoUnitario" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "custoTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldoAnterior" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldoPosterior" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "origem" TEXT NOT NULL,
    "ordemServicoId" TEXT,
    "itemOrdemServicoId" TEXT,
    "observacao" TEXT,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoqueInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caixa" (
    "id" TEXT NOT NULL,
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFechamento" TIMESTAMP(3),
    "saldoInicial" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldoFinalInformado" DECIMAL(65,30),
    "saldoFinalCalculado" DECIMAL(65,30),
    "divergencia" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoCaixa" (
    "id" TEXT NOT NULL,
    "caixaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "descricao" TEXT NOT NULL,
    "formaPagamentoId" TEXT,
    "pagamentoId" TEXT,
    "ordemServicoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cliente_nome_idx" ON "Cliente"("nome");

-- CreateIndex
CREATE INDEX "Cliente_telefone_idx" ON "Cliente"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServico_numero_key" ON "OrdemServico"("numero");

-- CreateIndex
CREATE INDEX "OrdemServico_numero_idx" ON "OrdemServico"("numero");

-- CreateIndex
CREATE INDEX "OrdemServico_status_idx" ON "OrdemServico"("status");

-- CreateIndex
CREATE INDEX "OrdemServico_clienteId_idx" ON "OrdemServico"("clienteId");

-- CreateIndex
CREATE INDEX "ItemOrdemServico_ordemServicoId_idx" ON "ItemOrdemServico"("ordemServicoId");

-- CreateIndex
CREATE INDEX "Servico_nome_idx" ON "Servico"("nome");

-- CreateIndex
CREATE INDEX "Servico_ativo_idx" ON "Servico"("ativo");

-- CreateIndex
CREATE INDEX "ServicoItemOrdem_itemOrdemServicoId_idx" ON "ServicoItemOrdem"("itemOrdemServicoId");

-- CreateIndex
CREATE INDEX "ServicoItemOrdem_servicoId_idx" ON "ServicoItemOrdem"("servicoId");

-- CreateIndex
CREATE INDEX "FormaPagamento_nome_idx" ON "FormaPagamento"("nome");

-- CreateIndex
CREATE INDEX "FormaPagamento_ativo_idx" ON "FormaPagamento"("ativo");

-- CreateIndex
CREATE INDEX "Pagamento_ordemServicoId_idx" ON "Pagamento"("ordemServicoId");

-- CreateIndex
CREATE INDEX "Pagamento_formaPagamentoId_idx" ON "Pagamento"("formaPagamentoId");

-- CreateIndex
CREATE INDEX "Pagamento_tipo_idx" ON "Pagamento"("tipo");

-- CreateIndex
CREATE INDEX "HistoricoStatus_ordemServicoId_idx" ON "HistoricoStatus"("ordemServicoId");

-- CreateIndex
CREATE INDEX "HistoricoStatus_statusNovo_idx" ON "HistoricoStatus"("statusNovo");

-- CreateIndex
CREATE INDEX "Insumo_nome_idx" ON "Insumo"("nome");

-- CreateIndex
CREATE INDEX "Insumo_ativo_idx" ON "Insumo"("ativo");

-- CreateIndex
CREATE INDEX "InsumoItemOrdem_itemOrdemServicoId_idx" ON "InsumoItemOrdem"("itemOrdemServicoId");

-- CreateIndex
CREATE INDEX "InsumoItemOrdem_insumoId_idx" ON "InsumoItemOrdem"("insumoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_insumoId_idx" ON "MovimentacaoEstoqueInsumo"("insumoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_tipo_idx" ON "MovimentacaoEstoqueInsumo"("tipo");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_origem_idx" ON "MovimentacaoEstoqueInsumo"("origem");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_criadoEm_idx" ON "MovimentacaoEstoqueInsumo"("criadoEm");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoqueInsumo_ordemServicoId_idx" ON "MovimentacaoEstoqueInsumo"("ordemServicoId");

-- CreateIndex
CREATE INDEX "Caixa_status_idx" ON "Caixa"("status");

-- CreateIndex
CREATE INDEX "Caixa_dataAbertura_idx" ON "Caixa"("dataAbertura");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoCaixa_pagamentoId_key" ON "MovimentacaoCaixa"("pagamentoId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_caixaId_idx" ON "MovimentacaoCaixa"("caixaId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_tipo_idx" ON "MovimentacaoCaixa"("tipo");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_origem_idx" ON "MovimentacaoCaixa"("origem");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_pagamentoId_idx" ON "MovimentacaoCaixa"("pagamentoId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_ordemServicoId_idx" ON "MovimentacaoCaixa"("ordemServicoId");

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrdemServico" ADD CONSTRAINT "ItemOrdemServico_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicoItemOrdem" ADD CONSTRAINT "ServicoItemOrdem_itemOrdemServicoId_fkey" FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicoItemOrdem" ADD CONSTRAINT "ServicoItemOrdem_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "FormaPagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoStatus" ADD CONSTRAINT "HistoricoStatus_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoItemOrdem" ADD CONSTRAINT "InsumoItemOrdem_itemOrdemServicoId_fkey" FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoItemOrdem" ADD CONSTRAINT "InsumoItemOrdem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoqueInsumo" ADD CONSTRAINT "MovimentacaoEstoqueInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoqueInsumo" ADD CONSTRAINT "MovimentacaoEstoqueInsumo_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoqueInsumo" ADD CONSTRAINT "MovimentacaoEstoqueInsumo_itemOrdemServicoId_fkey" FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "FormaPagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
