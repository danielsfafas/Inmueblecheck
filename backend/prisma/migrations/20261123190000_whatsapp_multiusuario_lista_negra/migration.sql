-- CreateEnum
CREATE TYPE "ProveedorWhatsapp" AS ENUM ('META_CLOUD', 'WHATSAPP_WEB_JS', 'BAILEYS', 'TWILIO');

-- CreateTable
CREATE TABLE "NumeroWhatsapp" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "proveedor" "ProveedorWhatsapp" NOT NULL DEFAULT 'WHATSAPP_WEB_JS',
    "phoneNumberId" TEXT,
    "accessToken" TEXT,
    "sessionData" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "estadoConexion" TEXT DEFAULT 'disconnected',
    "ultimaConexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumeroWhatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaNegra" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "numeroWhatsappId" TEXT,
    "numeroRemitente" TEXT NOT NULL,
    "nombreContacto" TEXT,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaNegra_pkey" PRIMARY KEY ("id")
);

-- AlterTable Conversacion - agregar numeroWhatsappId
ALTER TABLE "Conversacion" ADD COLUMN "numeroWhatsappId" TEXT;

-- CreateIndex
CREATE INDEX "NumeroWhatsapp_usuarioId_idx" ON "NumeroWhatsapp"("usuarioId");
CREATE INDEX "NumeroWhatsapp_numero_idx" ON "NumeroWhatsapp"("numero");
CREATE INDEX "NumeroWhatsapp_phoneNumberId_idx" ON "NumeroWhatsapp"("phoneNumberId");
CREATE UNIQUE INDEX "NumeroWhatsapp_numero_key" ON "NumeroWhatsapp"("numero");

-- CreateIndex
CREATE INDEX "ListaNegra_usuarioId_idx" ON "ListaNegra"("usuarioId");
CREATE INDEX "ListaNegra_numeroWhatsappId_idx" ON "ListaNegra"("numeroWhatsappId");
CREATE INDEX "ListaNegra_numeroRemitente_idx" ON "ListaNegra"("numeroRemitente");
CREATE UNIQUE INDEX "ListaNegra_usuarioId_numeroRemitente_key" ON "ListaNegra"("usuarioId", "numeroRemitente");

-- CreateIndex
CREATE INDEX "Conversacion_numeroWhatsappId_idx" ON "Conversacion"("numeroWhatsappId");

-- AddForeignKey
ALTER TABLE "NumeroWhatsapp" ADD CONSTRAINT "NumeroWhatsapp_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaNegra" ADD CONSTRAINT "ListaNegra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaNegra" ADD CONSTRAINT "ListaNegra_numeroWhatsappId_fkey" FOREIGN KEY ("numeroWhatsappId") REFERENCES "NumeroWhatsapp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_numeroWhatsappId_fkey" FOREIGN KEY ("numeroWhatsappId") REFERENCES "NumeroWhatsapp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migración de datos: si existe configuración de WhatsApp en env, crear primer número para admin
-- (esto se hará en un script separado post-migración)
