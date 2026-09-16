-- Foto opcional do item no recebimento. O arquivo permanece no storage
-- privado; o banco persiste somente a chave opaca gerada pela aplicação.
ALTER TABLE "ItemOrdemServico"
ADD COLUMN "fotoRecebimentoPathname" TEXT;
