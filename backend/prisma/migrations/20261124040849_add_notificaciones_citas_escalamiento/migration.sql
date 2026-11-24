-- AlterTable Usuario: add telefonoWhatsapp
ALTER TABLE "Usuario" ADD COLUMN "telefonoWhatsapp" TEXT;

-- AlterTable Inmobiliaria: add configuración bot y citas
ALTER TABLE "Inmobiliaria" ADD COLUMN "horasAutoresumeBotPausa" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Inmobiliaria" ADD COLUMN "duracionCitaMin" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Inmobiliaria" ADD COLUMN "tiempoAntelacionMin" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "Inmobiliaria" ADD COLUMN "diasConCitasAdelante" INTEGER NOT NULL DEFAULT 45;

-- AlterTable Conversacion: add bot pause + flujo
ALTER TABLE "Conversacion" ADD COLUMN "botPausadoHasta" TIMESTAMP(3);
ALTER TABLE "Conversacion" ADD COLUMN "flujoBot" TEXT;
ALTER TABLE "Conversacion" ADD COLUMN "flujoEstado" JSONB;

-- CreateIndex
CREATE INDEX "Conversacion_botPausadoHasta_idx" ON "Conversacion"("botPausadoHasta");

-- CreateEnum TipoNotificacion
CREATE TYPE "TipoNotificacion" AS ENUM ('AGENTE_SOLICITADO', 'CITA_CREADA', 'CITA_CANCELADA', 'MENSAJE_NUEVO', 'SISTEMA');

-- CreateTable Notificacion
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "enlace" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "leidaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacion_inmobiliariaId_idx" ON "Notificacion"("inmobiliariaId");
CREATE INDEX "Notificacion_usuarioId_idx" ON "Notificacion"("usuarioId");
CREATE INDEX "Notificacion_leida_idx" ON "Notificacion"("leida");
CREATE INDEX "Notificacion_createdAt_idx" ON "Notificacion"("createdAt");

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum EstadoCita
CREATE TYPE "EstadoCita" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO');

-- CreateEnum OrigenCita
CREATE TYPE "OrigenCita" AS ENUM ('WHATSAPP', 'ADMIN', 'WEB');

-- CreateTable Cita
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "prospectoId" TEXT NOT NULL,
    "propiedadId" TEXT,
    "asesorId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL DEFAULT 60,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PENDIENTE',
    "origen" "OrigenCita" NOT NULL DEFAULT 'WHATSAPP',
    "notas" TEXT,
    "motivoCancelacion" TEXT,
    "confirmadaAt" TIMESTAMP(3),
    "canceladaAt" TIMESTAMP(3),
    "recordatorioEnviadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cita_inmobiliariaId_idx" ON "Cita"("inmobiliariaId");
CREATE INDEX "Cita_prospectoId_idx" ON "Cita"("prospectoId");
CREATE INDEX "Cita_propiedadId_idx" ON "Cita"("propiedadId");
CREATE INDEX "Cita_asesorId_idx" ON "Cita"("asesorId");
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");
CREATE INDEX "Cita_estado_idx" ON "Cita"("estado");

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_prospectoId_fkey" FOREIGN KEY ("prospectoId") REFERENCES "Prospecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable HorarioCitas
CREATE TABLE "HorarioCitas" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "pausaInicio" TEXT,
    "pausaFin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HorarioCitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HorarioCitas_inmobiliariaId_diaSemana_key" ON "HorarioCitas"("inmobiliariaId", "diaSemana");
CREATE INDEX "HorarioCitas_inmobiliariaId_idx" ON "HorarioCitas"("inmobiliariaId");

-- AddForeignKey
ALTER TABLE "HorarioCitas" ADD CONSTRAINT "HorarioCitas_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CierreCalendario
CREATE TABLE "CierreCalendario" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "diaCompleto" BOOLEAN NOT NULL DEFAULT true,
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CierreCalendario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CierreCalendario_inmobiliariaId_idx" ON "CierreCalendario"("inmobiliariaId");
CREATE INDEX "CierreCalendario_fecha_idx" ON "CierreCalendario"("fecha");

-- AddForeignKey
ALTER TABLE "CierreCalendario" ADD CONSTRAINT "CierreCalendario_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
