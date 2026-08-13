-- Fase 26: identidade visual do estabelecimento — logo (escalar no agregado) e galeria de fotos.
-- Guardamos apenas a CHAVE de armazenamento (opaca), nunca uma URL absoluta: trocar o adaptador
-- de disco local por S3/R2 não pode virar migração de dados.
ALTER TABLE "establishments" ADD COLUMN "logo_storage_key" TEXT;
ALTER TABLE "establishments" ADD COLUMN "logo_thumb_storage_key" TEXT;

CREATE TABLE "establishment_photos" (
    "id" TEXT NOT NULL,
    "establishment_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "thumb_storage_key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "caption" TEXT,
    -- Ordem de exibição na página pública. Sem UNIQUE de propósito: a reordenação reescreve a
    -- lista inteira numa transação e um índice único imediato colidiria no meio do caminho —
    -- diferente de establishment_business_hours, onde (establishment_id, weekday) é chave
    -- natural, não chave de ordenação.
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establishment_photos_establishment_id_position_idx"
    ON "establishment_photos"("establishment_id", "position");

ALTER TABLE "establishment_photos"
    ADD CONSTRAINT "establishment_photos_establishment_id_fkey"
    FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
