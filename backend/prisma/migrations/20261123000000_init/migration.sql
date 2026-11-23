-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'SUPERVISOR', 'EJECUTIVO');

-- CreateEnum
CREATE TYPE "TipoOperacion" AS ENUM ('VENTA', 'RENTA');

-- CreateEnum
CREATE TYPE "EstadoPropiedad" AS ENUM ('DISPONIBLE', 'APARTADA', 'VENDIDA');

-- CreateEnum
CREATE TYPE "Calificacion" AS ENUM ('CALIENTE', 'TIBIO', 'FRIO');

-- CreateEnum
CREATE TYPE "EtapaEmbudo" AS ENUM ('NUEVO', 'CONTACTADO', 'VISITA', 'OFERTA', 'APARTADO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('MENSAJE', 'LLAMADA', 'VISITA', 'NOTA', 'CAMBIO_ETAPA');

-- CreateEnum
CREATE TYPE "TipoConsentimiento" AS ENUM ('AVISO_PRIVACIDAD', 'DATOS_FINANCIEROS', 'TRANSFERENCIAS', 'OPTIN_WHATSAPP_SERVICIO', 'OPTIN_WHATSAPP_MARKETING', 'OPTIN_LLAMADAS', 'COOKIES_ANALITICA', 'TERMINOS_SAAS', 'ENCARGO');

-- CreateEnum
CREATE TYPE "AccionConsentimiento" AS ENUM ('OTORGA', 'REVOCA', 'BAJA');

-- CreateTable
CREATE TABLE "Inmobiliaria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rfc" TEXT,
    "domicilio" TEXT,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailPrivacidad" TEXT NOT NULL,
    "horario" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "registroProfeco" TEXT,
    "licenciaEstatal" TEXT,
    "urlAvisoPrivacidad" TEXT,
    "leyendaProfeco" TEXT,
    "leyendaNom247" TEXT,
    "permiteCookies" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inmobiliaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'EJECUTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Propiedad" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" "TipoOperacion" NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "direccion" TEXT,
    "colonia" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Hidalgo',
    "codigoPostal" TEXT,
    "latitud" DECIMAL(10,8),
    "longitud" DECIMAL(11,8),
    "latitudAprox" DECIMAL(10,8),
    "longitudAprox" DECIMAL(11,8),
    "metrosTerreno" DECIMAL(10,2),
    "metrosConstruccion" DECIMAL(10,2) NOT NULL,
    "recamaras" INTEGER NOT NULL,
    "banos" INTEGER NOT NULL,
    "estacionamientos" INTEGER NOT NULL DEFAULT 0,
    "aceptaContado" BOOLEAN NOT NULL DEFAULT true,
    "aceptaBancario" BOOLEAN NOT NULL DEFAULT false,
    "aceptaInfonavit" BOOLEAN NOT NULL DEFAULT false,
    "aceptaFovissste" BOOLEAN NOT NULL DEFAULT false,
    "estadoPropiedad" "EstadoPropiedad" NOT NULL DEFAULT 'DISPONIBLE',
    "fotos" TEXT[],
    "videoUrl" TEXT,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "clicsWhatsapp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propiedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospecto" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "presupuesto" DECIMAL(12,2),
    "formaPago" TEXT,
    "creditoPreaprobado" DECIMAL(12,2),
    "calificacion" "Calificacion" NOT NULL DEFAULT 'FRIO',
    "calificacionManual" BOOLEAN NOT NULL DEFAULT false,
    "origen" TEXT,
    "ejecutivoId" TEXT,
    "etapa" "EtapaEmbudo" NOT NULL DEFAULT 'NUEVO',
    "noContactar" BOOLEAN NOT NULL DEFAULT false,
    "motivoBaja" TEXT,
    "fechaBaja" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interes" (
    "id" TEXT NOT NULL,
    "prospectoId" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversacion" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "prospectoId" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL DEFAULT 'whatsapp',
    "idExterno" TEXT,
    "atendidoPorBot" BOOLEAN NOT NULL DEFAULT true,
    "pasadoAHumano" BOOLEAN NOT NULL DEFAULT false,
    "resumenBot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" TEXT NOT NULL,
    "conversacionId" TEXT NOT NULL,
    "remitente" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "esBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "prospectoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" "TipoActividad" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recordatorio" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "prospectoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaRecordatorio" TIMESTAMP(3) NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recordatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consentimiento" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "prospectoId" TEXT,
    "titular" TEXT NOT NULL,
    "tipo" "TipoConsentimiento" NOT NULL,
    "accion" "AccionConsentimiento" NOT NULL,
    "versionDocumento" TEXT NOT NULL,
    "textoHash" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consentimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inmobiliaria_email_key" ON "Inmobiliaria"("email");

-- CreateIndex
CREATE INDEX "Inmobiliaria_email_idx" ON "Inmobiliaria"("email");

-- CreateIndex
CREATE INDEX "Usuario_inmobiliariaId_idx" ON "Usuario"("inmobiliariaId");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_inmobiliariaId_email_key" ON "Usuario"("inmobiliariaId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_token_key" ON "Sesion"("token");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_idx" ON "Sesion"("usuarioId");

-- CreateIndex
CREATE INDEX "Sesion_token_idx" ON "Sesion"("token");

-- CreateIndex
CREATE INDEX "Propiedad_inmobiliariaId_idx" ON "Propiedad"("inmobiliariaId");

-- CreateIndex
CREATE INDEX "Propiedad_estado_idx" ON "Propiedad"("estado");

-- CreateIndex
CREATE INDEX "Propiedad_tipo_idx" ON "Propiedad"("tipo");

-- CreateIndex
CREATE INDEX "Prospecto_inmobiliariaId_idx" ON "Prospecto"("inmobiliariaId");

-- CreateIndex
CREATE INDEX "Prospecto_telefono_idx" ON "Prospecto"("telefono");

-- CreateIndex
CREATE INDEX "Prospecto_ejecutivoId_idx" ON "Prospecto"("ejecutivoId");

-- CreateIndex
CREATE INDEX "Prospecto_etapa_idx" ON "Prospecto"("etapa");

-- CreateIndex
CREATE INDEX "Prospecto_calificacion_idx" ON "Prospecto"("calificacion");

-- CreateIndex
CREATE INDEX "Interes_prospectoId_idx" ON "Interes"("prospectoId");

-- CreateIndex
CREATE INDEX "Interes_propiedadId_idx" ON "Interes"("propiedadId");

-- CreateIndex
CREATE UNIQUE INDEX "Interes_prospectoId_propiedadId_key" ON "Interes"("prospectoId", "propiedadId");

-- CreateIndex
CREATE INDEX "Conversacion_inmobiliariaId_idx" ON "Conversacion"("inmobiliariaId");

-- CreateIndex
CREATE INDEX "Conversacion_prospectoId_idx" ON "Conversacion"("prospectoId");

-- CreateIndex
CREATE INDEX "Conversacion_idExterno_idx" ON "Conversacion"("idExterno");

-- CreateIndex
CREATE INDEX "Mensaje_conversacionId_idx" ON "Mensaje"("conversacionId");

-- CreateIndex
CREATE INDEX "Mensaje_createdAt_idx" ON "Mensaje"("createdAt");

-- CreateIndex
CREATE INDEX "Actividad_inmobiliariaId_idx" ON "Actividad"("inmobiliariaId");

-- CreateIndex
CREATE INDEX "Actividad_prospectoId_idx" ON "Actividad"("prospectoId");

-- CreateIndex
CREATE INDEX "Actividad_usuarioId_idx" ON "Actividad"("usuarioId");

-- CreateIndex
CREATE INDEX "Actividad_tipo_idx" ON "Actividad"("tipo");

-- CreateIndex
CREATE INDEX "Actividad_createdAt_idx" ON "Actividad"("createdAt");

-- CreateIndex
CREATE INDEX "Recordatorio_inmobiliariaId_idx" ON "Recordatorio"("inmobiliariaId");

-- CreateIndex
CREATE INDEX "Recordatorio_prospectoId_idx" ON "Recordatorio"("prospectoId");

-- CreateIndex
CREATE INDEX "Recordatorio_usuarioId_idx" ON "Recordatorio"("usuarioId");

-- CreateIndex
CREATE INDEX "Recordatorio_fechaRecordatorio_idx" ON "Recordatorio"("fechaRecordatorio");

-- CreateIndex
CREATE INDEX "Recordatorio_completado_idx" ON "Recordatorio"("completado");

-- CreateIndex
CREATE INDEX "Consentimiento_inmobiliariaId_idx" ON "Consentimiento"("inmobiliariaId");

-- CreateIndex
CREATE INDEX "Consentimiento_prospectoId_idx" ON "Consentimiento"("prospectoId");

-- CreateIndex
CREATE INDEX "Consentimiento_tipo_idx" ON "Consentimiento"("tipo");

-- CreateIndex
CREATE INDEX "Consentimiento_createdAt_idx" ON "Consentimiento"("createdAt");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Propiedad" ADD CONSTRAINT "Propiedad_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospecto" ADD CONSTRAINT "Prospecto_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospecto" ADD CONSTRAINT "Prospecto_ejecutivoId_fkey" FOREIGN KEY ("ejecutivoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interes" ADD CONSTRAINT "Interes_prospectoId_fkey" FOREIGN KEY ("prospectoId") REFERENCES "Prospecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interes" ADD CONSTRAINT "Interes_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_prospectoId_fkey" FOREIGN KEY ("prospectoId") REFERENCES "Prospecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_prospectoId_fkey" FOREIGN KEY ("prospectoId") REFERENCES "Prospecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_prospectoId_fkey" FOREIGN KEY ("prospectoId") REFERENCES "Prospecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimiento" ADD CONSTRAINT "Consentimiento_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimiento" ADD CONSTRAINT "Consentimiento_prospectoId_fkey" FOREIGN KEY ("prospectoId") REFERENCES "Prospecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
