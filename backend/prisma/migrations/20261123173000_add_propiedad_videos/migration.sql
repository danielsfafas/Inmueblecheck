-- CreateEnum
CREATE TYPE "TipoVideo" AS ENUM ('YOUTUBE', 'ARCHIVO');

-- CreateTable
CREATE TABLE "PropiedadVideo" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "tipo" "TipoVideo" NOT NULL,
    "youtubeId" TEXT,
    "archivoUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropiedadVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropiedadVideo_propiedadId_idx" ON "PropiedadVideo"("propiedadId");

-- CreateIndex
CREATE INDEX "PropiedadVideo_orden_idx" ON "PropiedadVideo"("orden");

-- AddForeignKey
ALTER TABLE "PropiedadVideo" ADD CONSTRAINT "PropiedadVideo_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
