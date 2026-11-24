import { prisma } from '../index.js';
import { sendBaileysMessage } from './baileys.service.js';
import { construirUrlPropiedad } from '../utils/publicUrl.js';
import { format } from 'date-fns';
import es from 'date-fns/locale/es/index.js';

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Texto que recibe el prospecto cuando el panel crea, reprograma, confirma o cancela su cita.
 */
export function construirMensajeCita(tipo, cita, inmobiliaria, { motivo } = {}) {
  const dia = capitalizar(format(new Date(cita.fecha), "EEEE d 'de' MMMM", { locale: es }));
  const lineasDetalle = [
    `📅 ${dia}`,
    `🕐 ${cita.hora}`,
    cita.propiedad ? `🏠 ${cita.propiedad.titulo}` : null,
    cita.propiedad ? `🔗 ${construirUrlPropiedad(cita.propiedad.id, inmobiliaria)}` : null,
    cita.asesor ? `👤 Asesor: ${cita.asesor.nombre}` : null,
  ].filter(Boolean).join('\n');

  const nombre = cita.prospecto?.nombre ? `Hola ${cita.prospecto.nombre.split(' ')[0]}, ` : '';
  switch (tipo) {
    case 'CREADA':
      return `✅ *${nombre}tu visita quedó agendada*\n\n${lineasDetalle}\n\n¡Te esperamos! Para cancelar o reagendar, escribe *CITA*.`;
    case 'REPROGRAMADA':
      return `🔁 *${nombre}tu visita cambió de horario*\n\n${lineasDetalle}\n\nSi no te queda, escribe *CITA* para reagendar.`;
    case 'CONFIRMADA':
      return `✅ *${nombre}tu visita está confirmada*\n\n${lineasDetalle}\n\n¡Te esperamos!`;
    case 'CANCELADA':
      return `❌ *${nombre}tu visita fue cancelada*\n\n${lineasDetalle}${motivo ? `\n\nMotivo: ${motivo}` : ''}\n\nPara agendar otra, escribe *AGENDAR*.`;
    default:
      return null;
  }
}

/**
 * Envía el mensaje al prospecto por el WhatsApp conectado de la inmobiliaria.
 * Nunca lanza: devuelve { enviado, motivo }.
 */
export async function enviarMensajeCitaAlProspecto(tipo, cita, { motivo } = {}) {
  try {
    const prospecto = cita.prospecto
      || await prisma.prospecto.findUnique({ where: { id: cita.prospectoId } });
    if (!prospecto?.telefono) return { enviado: false, motivo: 'El prospecto no tiene teléfono' };
    if (prospecto.noContactar) return { enviado: false, motivo: 'El prospecto pidió no ser contactado' };

    const inmobiliaria = await prisma.inmobiliaria.findUnique({ where: { id: cita.inmobiliariaId } });
    const texto = construirMensajeCita(tipo, { ...cita, prospecto }, inmobiliaria, { motivo });
    if (!texto) return { enviado: false, motivo: 'Sin mensaje para este cambio' };

    // Preferir la conversación existente (respeta el JID @lid del cliente)
    const conversacion = await prisma.conversacion.findFirst({
      where: { prospectoId: prospecto.id, numeroWhatsappId: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });

    let numeroWhatsappId = conversacion?.numeroWhatsappId || null;
    if (!numeroWhatsappId) {
      const numero = await prisma.numeroWhatsapp.findFirst({
        where: { activo: true, estadoConexion: 'connected', usuario: { inmobiliariaId: cita.inmobiliariaId } },
        orderBy: { ultimaConexion: 'desc' },
      });
      numeroWhatsappId = numero?.id || null;
    }
    if (!numeroWhatsappId) return { enviado: false, motivo: 'No hay un WhatsApp conectado' };

    const remoteJid = conversacion?.idExterno?.includes('@') ? conversacion.idExterno : null;
    await sendBaileysMessage(numeroWhatsappId, prospecto.telefono.replace(/\D/g, ''), texto, remoteJid);

    if (conversacion) {
      await prisma.mensaje.create({
        data: { conversacionId: conversacion.id, remitente: 'bot', contenido: texto, esBot: true },
      });
    }
    return { enviado: true };
  } catch (error) {
    console.error('Error enviando WhatsApp de cita:', error.message);
    return { enviado: false, motivo: 'No se pudo enviar el WhatsApp' };
  }
}
