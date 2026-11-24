import { prisma } from '../index.js';
import { sendBaileysMessage } from '../services/baileys.service.js';
import { addMinutes, format, isAfter, isBefore } from 'date-fns';
import es from 'date-fns/locale/es/index.js';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Mexico_City';
const MINUTOS_ANTES = 120; // 2 horas antes

/**
 * Job de recordatorios de citas
 * Ejecuta cada minuto
 */
export function iniciarJobRecordatoriosCitas() {
  console.log('🔔 Job de recordatorios de citas iniciado');

  // Ejecutar cada 60 segundos
  setInterval(async () => {
    try {
      await procesarRecordatorios();
    } catch (error) {
      console.error('Error en job de recordatorios:', error);
    }
  }, 60000);
}

async function procesarRecordatorios() {
  const ahoraLocal = utcToZonedTime(new Date(), TIMEZONE);
  const ventanaInicio = ahoraLocal;
  const ventanaFin = addMinutes(ahoraLocal, 5); // Ventana de 5 minutos

  // Buscar citas CONFIRMADAS sin recordatorio enviado
  // con fecha/hora entre ahora y ahora + MINUTOS_ANTES (con margen de ventana)
  const citas = await prisma.cita.findMany({
    where: {
      estado: 'CONFIRMADA',
      recordatorioEnviadoAt: null,
      fecha: {
        gte: new Date(ventanaInicio),
      },
    },
    include: {
      prospecto: true,
      propiedad: true,
      asesor: true,
      inmobiliaria: true,
    },
  });

  for (const cita of citas) {
    try {
      // Construir DateTime de la cita en timezone local
      const fechaCita = new Date(cita.fecha);
      const [horaStr, minStr] = cita.hora.split(':');
      fechaCita.setHours(parseInt(horaStr), parseInt(minStr), 0, 0);

      // Calcular momento de recordatorio (MINUTOS_ANTES antes de la cita)
      const momentoRecordatorio = addMinutes(fechaCita, -MINUTOS_ANTES);

      // Verificar si ya pasó el momento de recordatorio y está en ventana
      if (isAfter(ahoraLocal, momentoRecordatorio) && isBefore(ahoraLocal, ventanaFin)) {
        await enviarRecordatorio(cita);
      }
    } catch (error) {
      console.error(`Error procesando recordatorio cita ${cita.id}:`, error);
    }
  }
}

async function enviarRecordatorio(cita) {
  try {
    const fechaCita = new Date(cita.fecha);
    const fechaStr = format(fechaCita, "EEEE d 'de' MMMM", { locale: es });

    // Recordatorio al cliente
    let mensajeCliente = `🔔 *Recordatorio de Cita*\n\n`;
    mensajeCliente += `Tienes una cita programada:\n\n`;
    mensajeCliente += `📅 ${fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)}\n`;
    mensajeCliente += `🕐 ${cita.hora}\n`;
    
    if (cita.propiedad) {
      mensajeCliente += `🏠 ${cita.propiedad.titulo}\n`;
      mensajeCliente += `📍 ${cita.propiedad.colonia}, ${cita.propiedad.ciudad}\n`;
    }
    
    if (cita.asesor) {
      mensajeCliente += `👤 Asesor: ${cita.asesor.nombre}\n`;
    }
    
    mensajeCliente += `\n¡Te esperamos! 😊`;

    // Buscar conversación del prospecto para obtener numeroWhatsappId
    const conversacion = await prisma.conversacion.findFirst({
      where: {
        prospectoId: cita.prospectoId,
        numeroWhatsappId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        numeroWhatsapp: true,
      },
    });

    if (conversacion?.numeroWhatsapp?.proveedor === 'BAILEYS') {
      await sendBaileysMessage(
        conversacion.numeroWhatsappId,
        cita.prospecto.telefono.replace(/\D/g, ''),
        mensajeCliente
      );
      console.log(`✅ Recordatorio enviado a cliente: ${cita.prospecto.nombre}`);
    } else {
      console.warn(`⚠️ No se pudo enviar recordatorio a ${cita.prospecto.nombre}: sin conexión Baileys`);
    }

    // Recordatorio al asesor si tiene WhatsApp
    if (cita.asesor?.telefonoWhatsapp && conversacion?.numeroWhatsappId) {
      let mensajeAsesor = `🔔 *Recordatorio de Cita*\n\n`;
      mensajeAsesor += `Tienes una cita en 2 horas:\n\n`;
      mensajeAsesor += `*Cliente:* ${cita.prospecto.nombre} (${cita.prospecto.telefono})\n`;
      mensajeAsesor += `*Fecha:* ${fechaStr} a las ${cita.hora}\n`;
      
      if (cita.propiedad) {
        mensajeAsesor += `*Propiedad:* ${cita.propiedad.titulo}\n`;
      }

      await sendBaileysMessage(
        conversacion.numeroWhatsappId,
        cita.asesor.telefonoWhatsapp.replace(/\D/g, ''),
        mensajeAsesor
      );
      console.log(`✅ Recordatorio enviado a asesor: ${cita.asesor.nombre}`);
    }

    // Marcar recordatorio como enviado
    await prisma.cita.update({
      where: { id: cita.id },
      data: { recordatorioEnviadoAt: new Date() },
    });

  } catch (error) {
    console.error(`Error enviando recordatorio cita ${cita.id}:`, error);
  }
}
