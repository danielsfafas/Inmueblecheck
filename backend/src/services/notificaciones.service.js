import { prisma, io } from '../index.js';
import { sendBaileysMessage } from './baileys.service.js';

/**
 * Crear notificación en BD y emitir evento Socket.IO
 */
export async function crearNotificacion({ inmobiliariaId, usuarioId, tipo, titulo, mensaje, enlace }) {
  const notificacion = await prisma.notificacion.create({
    data: {
      inmobiliariaId,
      usuarioId,
      tipo,
      titulo,
      mensaje,
      enlace,
    },
  });

  // Emitir evento Socket.IO para notificación en tiempo real
  if (io) {
    io.to(`user-${usuarioId}`).emit('notificacion', {
      id: notificacion.id,
      tipo: notificacion.tipo,
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje,
      enlace: notificacion.enlace,
      createdAt: notificacion.createdAt,
    });
  }

  return notificacion;
}

/**
 * Notificar al asesor por WhatsApp cuando cliente solicita AGENTE
 */
export async function notificarAsesorPorWhatsApp({
  numeroWhatsappId,
  prospecto,
  conversacion,
  propiedadInteres = null,
  ultimosMensajes = [],
}) {
  try {
    // Determinar asesor: asignado al prospecto o dueño del numeroWhatsapp
    let asesor = prospecto.ejecutivo;
    
    if (!asesor) {
      // Buscar dueño del número WhatsApp
      const numeroWhatsapp = await prisma.numeroWhatsapp.findUnique({
        where: { id: numeroWhatsappId },
        include: { usuario: true },
      });
      
      if (numeroWhatsapp?.usuario) {
        asesor = numeroWhatsapp.usuario;
      } else {
        // Fallback: admin de la inmobiliaria
        asesor = await prisma.usuario.findFirst({
          where: {
            inmobiliariaId: prospecto.inmobiliariaId,
            rol: 'ADMIN',
            activo: true,
          },
        });
      }
    }

    if (!asesor) {
      console.warn('No se encontró asesor para notificar');
      return null;
    }

    // Verificar que tenga teléfono WhatsApp configurado
    if (!asesor.telefonoWhatsapp) {
      console.warn(`Asesor ${asesor.nombre} no tiene telefonoWhatsapp configurado`);
      return null;
    }

    // Construir mensaje para el asesor
    let mensajeAsesor = `🔔 *Solicitud de Atención*\n\n`;
    mensajeAsesor += `*Prospecto:* ${prospecto.nombre}\n`;
    mensajeAsesor += `*Teléfono:* ${prospecto.telefono}\n`;
    
    if (propiedadInteres) {
      mensajeAsesor += `*Interés:* ${propiedadInteres.titulo}\n`;
    }
    
    if (ultimosMensajes.length > 0) {
      mensajeAsesor += `\n*Últimos mensajes del cliente:*\n`;
      ultimosMensajes.slice(-3).forEach((msg) => {
        const preview = msg.contenido.length > 80 
          ? msg.contenido.substring(0, 80) + '...' 
          : msg.contenido;
        mensajeAsesor += `- "${preview}"\n`;
      });
    }

    // Link al panel (usar dominio configurado o localhost para dev)
    const panelUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    mensajeAsesor += `\n🔗 Ver en panel: ${panelUrl}/admin/conversaciones/${conversacion.id}`;

    // Enviar WhatsApp via Baileys usando el mismo número receptor
    await sendBaileysMessage(
      numeroWhatsappId,
      asesor.telefonoWhatsapp.replace(/\D/g, ''),
      mensajeAsesor
    );

    console.log(`✅ WhatsApp enviado a asesor ${asesor.nombre} (${asesor.telefonoWhatsapp})`);
    return asesor;

  } catch (error) {
    console.error('Error notificando asesor por WhatsApp:', error);
    return null;
  }
}

/**
 * Marcar notificaciones como leídas
 */
export async function marcarNotificacionesLeidas(usuarioId, notificacionIds) {
  await prisma.notificacion.updateMany({
    where: {
      id: { in: notificacionIds },
      usuarioId,
    },
    data: {
      leida: true,
      leidaAt: new Date(),
    },
  });
}
