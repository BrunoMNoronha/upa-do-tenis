-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "cpfCnpj" TEXT,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrdemServico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "dataEntrada" DATETIME NOT NULL,
    "dataPrevisao" DATETIME NOT NULL,
    "dataConclusao" DATETIME,
    "valorTotal" DECIMAL NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL NOT NULL DEFAULT 0,
    "valorSinal" DECIMAL NOT NULL DEFAULT 0,
    "valorPago" DECIMAL NOT NULL DEFAULT 0,
    "saldo" DECIMAL NOT NULL DEFAULT 0,
    "justificativaInicioSemAprovacao" TEXT,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "OrdemServico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemOrdemServico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordemServicoId" TEXT NOT NULL,
    "tipoItem" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "marca" TEXT,
    "cor" TEXT,
    "tamanho" TEXT,
    "observacoes" TEXT,
    "valor" DECIMAL NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "ItemOrdemServico_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoBase" DECIMAL NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServicoItemOrdem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemOrdemServicoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServicoItemOrdem_itemOrdemServicoId_fkey" FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServicoItemOrdem_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordemServicoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL DEFAULT 0,
    "formaPagamento" TEXT NOT NULL,
    "dataPagamento" DATETIME NOT NULL,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pagamento_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoricoStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordemServicoId" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "observacao" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricoStatus_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "Pagamento_ordemServicoId_idx" ON "Pagamento"("ordemServicoId");

-- CreateIndex
CREATE INDEX "Pagamento_tipo_idx" ON "Pagamento"("tipo");

-- CreateIndex
CREATE INDEX "HistoricoStatus_ordemServicoId_idx" ON "HistoricoStatus"("ordemServicoId");

-- CreateIndex
CREATE INDEX "HistoricoStatus_statusNovo_idx" ON "HistoricoStatus"("statusNovo");
