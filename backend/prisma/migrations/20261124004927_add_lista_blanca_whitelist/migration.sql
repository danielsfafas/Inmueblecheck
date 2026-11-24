-- CreateTable
CREATE TABLE "ListaBlanca" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nombre" TEXT,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaBlanca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListaBlanca_usuarioId_idx" ON "ListaBlanca"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ListaBlanca_usuarioId_numero_key" ON "ListaBlanca"("usuarioId", "numero");

-- AddForeignKey
ALTER TABLE "ListaBlanca" ADD CONSTRAINT "ListaBlanca_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
