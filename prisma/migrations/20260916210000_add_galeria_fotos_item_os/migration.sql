-- Galeria privada de fotos por item da OS. A coluna legada permanece durante
-- a transicao para permitir rollback da aplicacao sem perda de leitura.
CREATE TABLE "FotoItemOrdem" (
    "id" TEXT NOT NULL,
    "itemOrdemServicoId" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoItemOrdem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FotoItemOrdem_pathname_key" ON "FotoItemOrdem"("pathname");
CREATE INDEX "FotoItemOrdem_itemOrdemServicoId_criadoEm_idx"
    ON "FotoItemOrdem"("itemOrdemServicoId", "criadoEm");

ALTER TABLE "FotoItemOrdem"
    ADD CONSTRAINT "FotoItemOrdem_itemOrdemServicoId_fkey"
    FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill idempotente das fotos unicas existentes. O id deterministico
-- permite auditar a origem legada e nao depende de extensoes do PostgreSQL.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "ItemOrdemServico"
        WHERE "fotoRecebimentoPathname" IS NOT NULL
        GROUP BY "fotoRecebimentoPathname"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Backfill interrompido: fotoRecebimentoPathname duplicado entre itens.';
    END IF;
END $$;

INSERT INTO "FotoItemOrdem" ("id", "itemOrdemServicoId", "pathname", "criadoEm")
SELECT
    'legacy_' || md5(item."id" || ':' || item."fotoRecebimentoPathname"),
    item."id",
    item."fotoRecebimentoPathname",
    item."criadoEm"
FROM "ItemOrdemServico" AS item
WHERE item."fotoRecebimentoPathname" IS NOT NULL
ON CONFLICT ("pathname") DO NOTHING;
