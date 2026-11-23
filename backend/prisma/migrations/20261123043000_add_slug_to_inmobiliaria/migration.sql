-- AlterTable
ALTER TABLE "Inmobiliaria" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Inmobiliaria_slug_key" ON "Inmobiliaria"("slug");

-- CreateIndex
CREATE INDEX "Inmobiliaria_slug_idx" ON "Inmobiliaria"("slug");

-- Backfill existing records with a default slug
UPDATE "Inmobiliaria" SET "slug" = LOWER(REGEXP_REPLACE(nombre, '[^a-zA-Z0-9]+', '-', 'g')) WHERE "slug" IS NULL;

-- Make slug required
ALTER TABLE "Inmobiliaria" ALTER COLUMN "slug" SET NOT NULL;
