import { prisma, redis } from '../index.js';
import { generarRespuestaIA } from './ia.service.js';
import { generarMensajeBienvenida } from '../utils/botMessages.js';

export async function procesarMensajeBot(telefono, mensaje) {
  try {
    console.log(`📱 Mensaje de ${telefono}: ${mensaje}`);

    // Buscar prospecto existente
    let prospecto = await prisma.prospecto.findFirst({
      where: { telefono },
      include: { inmobiliaria: true },
    });

    if (!prospecto) {
      console.log('Prospecto no encontrado, se requiere registro previo');
      return;
    }

    // Verificar si está en lista de no contactar
    if (prospecto.noContactar) {
      console.log('Prospecto en lista de no contactar');
      return;
    }

    // Buscar conversación activa (no pasada a humano, ni dado de baja)
    let conversacion = await prisma.conversacion.findFirst({
      where: {
        prospectoId: prospecto.id,
        pasadoAHumano: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        mensajes: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const esPrimeraInteraccion = !conversacion;

    if (!conversacion) {
      conversacion = await prisma.conversacion.create({
        data: {
          inmobiliariaId: prospecto.inmobiliariaId,
          prospectoId: prospecto.id,
          plataforma: 'whatsapp',
          idExterno: telefono,
          atendidoPorBot: true,
          pasadoAHumano: false,
        },
      });

      // Primer mensaje del bot CON DIVULGACIÓN DE IA (requisito legal)
      const mensajeBienvenida = generarMensajeBienvenida(prospecto.inmobiliaria.nombre);
      
      await prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          remitente: 'bot',
          contenido: mensajeBienvenida,
          esBot: true,
        },
      });

      await enviarMensajeWhatsApp(telefono, mensajeBienvenida);
    }

    // Guardar mensaje del prospecto
    await prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        remitente: telefono,
        contenido: mensaje,
        esBot: false,
      },
    });

    // Detectar comandos especiales
    const mensajeNormalizado = mensaje.toUpperCase().trim();

    // Comando BAJA
    if (mensajeNormalizado === 'BAJA' || mensajeNormalizado === 'STOP' || 
        mensajeNormalizado === 'CANCELAR' || mensajeNormalizado === 'NO MAS') {
      
      await prisma.prospecto.update({
        where: { id: prospecto.id },
        data: {
          noContactar: true,
          motivoBaja: 'Solicitado por WhatsApp',
          fechaBaja: new Date(),
        },
      });

      await prisma.consentimiento.create({
        data: {
          inmobiliariaId: prospecto.inmobiliariaId,
          prospectoId: prospecto.id,
          titular: prospecto.nombre,
          tipo: 'OPTIN_WHATSAPP_MARKETING',
          accion: 'BAJA',
          versionDocumento: '1.0',
          textoHash: '',
          canal: 'whatsapp',
        },
      });

      const respuesta = `Entendido, ${prospecto.nombre}. Has sido dado de baja de nuestra lista de contactos. No recibirás más mensajes promocionales de ${prospecto.inmobiliaria.nombre}. Gracias por tu tiempo.`;
      
      await prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          remitente: 'bot',
          contenido: respuesta,
          esBot: true,
        },
      });

      await enviarMensajeWhatsApp(telefono, respuesta);
      return;
    }

    // Comando AGENTE/HUMANO
    if (mensajeNormalizado === 'AGENTE' || mensajeNormalizado === 'HUMANO' || 
        mensajeNormalizado === 'ASESOR' || mensajeNormalizado.includes('HABLAR CON')) {
      
      await prisma.conversacion.update({
        where: { id: conversacion.id },
        data: { pasadoAHumano: true },
      });

      await prisma.actividad.create({
        data: {
          inmobiliariaId: prospecto.inmobiliariaId,
          prospectoId: prospecto.id,
          tipo: 'NOTA',
          titulo: 'Cliente solicita atención humana',
          descripcion: 'El cliente escribió el comando AGENTE en WhatsApp',
        },
      });

      const respuesta = `Perfecto, ${prospecto.nombre}. En breve uno de nuestros asesores se pondrá en contacto contigo. Gracias por tu interés.`;
      
      await prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          remitente: 'bot',
          contenido: respuesta,
          esBot: true,
        },
      });

      await enviarMensajeWhatsApp(telefono, respuesta);
      return;
    }

    // Generar respuesta con IA
    const contexto = await obtenerContextoConversacion(conversacion.id, prospecto);
    const respuestaIA = await generarRespuestaIA(mensaje, contexto);

    // Guardar respuesta del bot
    await prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        remitente: 'bot',
        contenido: respuestaIA,
        esBot: true,
      },
    });

    await enviarMensajeWhatsApp(telefono, respuestaIA);

    // Registrar actividad
    await prisma.actividad.create({
      data: {
        inmobiliariaId: prospecto.inmobiliariaId,
        prospectoId: prospecto.id,
        tipo: 'MENSAJE',
        titulo: 'Mensaje de WhatsApp',
        descripcion: `Cliente: ${mensaje.substring(0, 100)}`,
      },
    });

  } catch (error) {
    console.error('Error procesando mensaje bot:', error);
  }
}

// Función eliminada: La divulgación de IA ahora está inline en procesarMensajeBot
// Ver línea ~46-50 donde se crea el mensaje de bienvenida con divulgación legal

async function obtenerContextoConversacion(conversacionId, prospecto) {
  const mensajes = await prisma.mensaje.findMany({
    where: { conversacionId },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  const propiedades = await prisma.propiedad.findMany({
    where: {
      inmobiliariaId: prospecto.inmobiliariaId,
      estado: 'DISPONIBLE',
    },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      precio: true,
      colonia: true,
      ciudad: true,
      recamaras: true,
      banos: true,
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  return {
    inmobiliaria: prospecto.inmobiliaria,
    prospecto: {
      nombre: prospecto.nombre,
      presupuesto: prospecto.presupuesto,
      formaPago: prospecto.formaPago,
    },
    mensajesPrevios: mensajes.map(m => ({
      remitente: m.esBot ? 'bot' : 'cliente',
      contenido: m.contenido,
    })),
    propiedadesDisponibles: propiedades,
  };
}

async function enviarMensajeWhatsApp(telefono, mensaje) {
  if (process.env.AI_PROVIDER === 'simulado' || !process.env.WHATSAPP_ACCESS_TOKEN) {
    console.log(`[SIMULADO] Enviar a ${telefono}: ${mensaje}`);
    return;
  }

  // Implementación real con Meta WhatsApp Cloud API
  console.log(`TODO: Enviar mensaje real a ${telefono}`);
}
