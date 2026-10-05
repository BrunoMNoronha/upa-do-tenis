-- Catálogo público (#273). Migration aditiva: duas colunas em Produto, sem
-- backfill. `publicadoNoCatalogo` nasce false, então nenhum produto existente
-- fica público até ser marcado no painel. Compatível com a versão anterior da
-- aplicação.
-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "imagemPathname" TEXT,
ADD COLUMN     "publicadoNoCatalogo" BOOLEAN NOT NULL DEFAULT false;
