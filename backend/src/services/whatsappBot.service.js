import { prisma, redis } from '../index.js';
import { generarRespuestaIA } from './ia.service.js';
import { generarMensajeBienvenida } from '../utils/botMessages.js';
import {
  encontrarNumeroPorPhoneNumberId,
  estaEnListaNegra,
  normalizarNumeroE164,
} from '../utils/whatsapp-multiusuario.js';

export async function procesarMensajeBot(telefono, mensaje, phoneNumberId = null, numeroWhatsappId = null, remoteJid = null, pushName = null) {
  try {
    console.log(`📱 Mensaje de ${telefono}: ${mensaje}${phoneNumberId ? ` (phoneNumberId: ${phoneNumberId})` : ''}${numeroWhatsappId ? ` (numeroWhatsappId: ${numeroWhatsappId})` : ''}${remoteJid ? ` (remoteJid: ${remoteJid})` : ''}${pushName ? ` (pushName: ${pushName})` : ''}`);

    // 1. Encontrar número WhatsApp receptor (routing multi-usuario)
    let numeroReceptor = null;
    
    // Meta Cloud API usa phoneNumberId
    if (phoneNumberId) {
      numeroReceptor = await encontrarNumeroPorPhoneNumberId(prisma, phoneNumberId);
    }
    
    // Baileys/otros usan numeroWhatsappId directamente
    if (!numeroReceptor && numeroWhatsappId) {
      numeroReceptor = await prisma.numeroWhatsapp.findUnique({
        where: { id: numeroWhatsappId },
        include: {
          usuario: {
            include: {
              inmobiliaria: true,
            },
          },
        },
      });
    }

    if (!numeroReceptor) {
      console.log('⚠️ Número receptor no encontrado o inactivo');
      return;
    }

    console.log(`📞 Número receptor: ${numeroReceptor.nombre} (${numeroReceptor.numero}) - Usuario: ${numeroReceptor.usuario.nombre}`);

    // 2. Verificar lista negra del dueño del número receptor
    const telefonoNormalizado = normalizarNumeroE164(telefono);
    const bloqueado = await estaEnListaNegra(prisma, numeroReceptor.usuarioId, telefonoNormalizado);

    if (bloqueado) {
      console.log(`🚫 DECISIÓN: NO responder - Número ${telefono} está en lista negra del usuario ${numeroReceptor.usuario.nombre}`);
      
      // Buscar/crear prospecto para guardar el mensaje (sin responder)
      let prospecto = await prisma.prospecto.findFirst({
        where: {
          telefono: telefonoNormalizado || telefono,
          inmobiliariaId: numeroReceptor.usuario.inmobiliariaId,
        },
        include: { inmobiliaria: true },
      });

      if (!prospecto) {
        console.log('Prospecto no encontrado y está en lista negra - mensaje ignorado');
        return;
      }

      // Buscar o crear conversación
      let conversacion = await prisma.conversacion.findFirst({
        where: {
          prospectoId: prospecto.id,
          numeroWhatsappId: numeroReceptor.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!conversacion) {
        conversacion = await prisma.conversacion.create({
          data: {
            inmobiliariaId: numeroReceptor.usuario.inmobiliariaId,
            prospectoId: prospecto.id,
            numeroWhatsappId: numeroReceptor.id,
            plataforma: 'whatsapp',
            idExterno: telefono,
            atendidoPorBot: false, // Marcado como no atendido por bot (lista negra)
            pasadoAHumano: true, // Pasa directo a humano
          },
        });
      }

      // Guardar mensaje del cliente (sin respuesta del bot)
      await prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          remitente: telefono,
          contenido: mensaje,
          esBot: false,
        },
      });

      console.log('✅ Mensaje guardado (lista negra - sin respuesta de bot)');
      return;
    }

    // 3. Buscar o crear prospecto automáticamente
    let prospecto = await prisma.prospecto.findFirst({
      where: {
        telefono: telefonoNormalizado || telefono,
        inmobiliariaId: numeroReceptor.usuario.inmobiliariaId,
      },
      include: { inmobiliaria: true },
    });

    if (!prospecto) {
      console.log(`📝 Prospecto nuevo desde WhatsApp, creando automáticamente...`);
      
      // Determinar nombre y teléfono según si se pudo resolver el LID
      let nombreProspecto;
      let telefonoProspecto;
      let origenProspecto;
      
      if (telefonoNormalizado && !remoteJid?.includes('@lid')) {
        // Número E.164 resuelto correctamente
        nombreProspecto = pushName || telefonoNormalizado;
        telefonoProspecto = telefonoNormalizado;
        origenProspecto = 'WhatsApp';
      } else if (remoteJid?.includes('@lid')) {
        // LID no resuelto: usar pushName como nombre, LID completo en origen
        nombreProspecto = pushName || 'Usuario WhatsApp';
        telefonoProspecto = telefonoNormalizado || `LID-${Date.now()}`; // Fallback único si no hay PN
        origenProspecto = `WhatsApp LID: ${remoteJid}`;
      } else {
        // Fallback general
        nombreProspecto = pushName || telefono;
        telefonoProspecto = telefonoNormalizado || telefono;
        origenProspecto = 'WhatsApp';
      }
      
      prospecto = await prisma.prospecto.create({
        data: {
          inmobiliariaId: numeroReceptor.usuario.inmobiliariaId,
          nombre: nombreProspecto,
          telefono: telefonoProspecto,
          origen: origenProspecto,
          ejecutivoId: numeroReceptor.usuarioId,
          // calificacion omitido → usa @default(FRIO) del schema
          // etapa omitido → usa @default(NUEVO) del schema
        },
        include: { inmobiliaria: true },
      });

      console.log(`✅ Prospecto creado: ${prospecto.id} - ${nombreProspecto} (tel: ${telefonoProspecto}, origen: ${origenProspecto})`);
    }

    // Verificar si está en lista de no contactar
    if (prospecto.noContactar) {
      console.log(`🚫 DECISIÓN: NO responder - Prospecto ${prospecto.id} marcado con noContactar=true`);
      return;
    }

    // Buscar conversación activa (no pasada a humano, del mismo número WhatsApp receptor)
    let conversacion = await prisma.conversacion.findFirst({
      where: {
        prospectoId: prospecto.id,
        numeroWhatsappId: numeroReceptor.id,
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
          numeroWhatsappId: numeroReceptor.id,
          plataforma: 'whatsapp',
          idExterno: remoteJid || telefono, // Guardar remoteJid (@lid o @s.whatsapp.net)
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

      console.log(`📤 DECISIÓN: Enviar mensaje de bienvenida + aviso privacidad a ${telefono}`);
      await enviarMensajeWhatsApp(numeroReceptor, telefono, mensajeBienvenida, remoteJid);
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

      console.log(`📤 DECISIÓN: Enviar confirmación de BAJA a ${telefono}`);
      await enviarMensajeWhatsApp(numeroReceptor, telefono, respuesta, remoteJid);
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

      console.log(`📤 DECISIÓN: Enviar confirmación de solicitud AGENTE/HUMANO a ${telefono}`);
      await enviarMensajeWhatsApp(numeroReceptor, telefono, respuesta, remoteJid);
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

    console.log(`📤 DECISIÓN: Responder con IA (${contexto.inmobiliaria.nombre}) a ${telefono}`);
    await enviarMensajeWhatsApp(numeroReceptor, telefono, respuestaIA, remoteJid);

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

async function enviarMensajeWhatsApp(numeroReceptor, telefonoDestino, mensaje, remoteJid = null) {
  if (process.env.AI_PROVIDER === 'simulado') {
    console.log(`[SIMULADO] Enviar desde ${numeroReceptor.numero} a ${telefonoDestino}${remoteJid ? ` (JID: ${remoteJid})` : ''}: ${mensaje.substring(0, 100)}...`);
    return;
  }

  // Implementación real según proveedor
  if (numeroReceptor.proveedor === 'BAILEYS') {
    // Importación dinámica para evitar ciclos
    const { sendBaileysMessage } = await import('./baileys.service.js');
    await sendBaileysMessage(numeroReceptor.id, telefonoDestino, mensaje, remoteJid);
  } else if (numeroReceptor.proveedor === 'META_CLOUD') {
    console.log(`TODO: Enviar con Meta Cloud API desde ${numeroReceptor.phoneNumberId} a ${telefonoDestino}`);
    // Usar numeroReceptor.accessToken y numeroReceptor.phoneNumberId
  } else if (numeroReceptor.proveedor === 'WHATSAPP_WEB_JS') {
    console.log(`TODO: Enviar con whatsapp-web.js desde ${numeroReceptor.numero} a ${telefonoDestino}`);
    // Usar numeroReceptor.sessionData
  } else if (numeroReceptor.proveedor === 'TWILIO') {
    console.log(`TODO: Enviar con Twilio desde ${numeroReceptor.numero} a ${telefonoDestino}`);
    // Usar numeroReceptor.accessToken (Account SID + Auth Token)
  }
}
