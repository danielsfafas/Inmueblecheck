import { prisma, redis } from '../index.js';
import { generarRespuestaIA } from './ia.service.js';
import { generarMensajeBienvenida } from '../utils/botMessages.js';
import {
  encontrarNumeroPorPhoneNumberId,
  estaEnListaNegra,
  debeAtenderSegunListaBlanca,
  normalizarNumeroE164,
} from '../utils/whatsapp-multiusuario.js';
import { crearNotificacion, notificarAsesorPorWhatsApp } from './notificaciones.service.js';
import { iniciarFlujoCita, procesarFlujoCita, gestionarCitaExistente } from './citasFlow.service.js';

/**
 * Actualizar datos del prospecto cuando el bot aprende información
 */
export async function actualizarProspecto(prospectoId, datos) {
  const datosActualizacion = {};
  
  if (datos.presupuesto !== undefined) datosActualizacion.presupuesto = datos.presupuesto;
  if (datos.formaPago !== undefined) datosActualizacion.formaPago = datos.formaPago;
  if (datos.creditoPreaprobado !== undefined) datosActualizacion.creditoPreaprobado = datos.creditoPreaprobado;
  
  if (Object.keys(datosActualizacion).length > 0) {
    await prisma.prospecto.update({
      where: { id: prospectoId },
      data: datosActualizacion,
    });
  }
}

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

    // 2. Verificar lista negra del dueño del número receptor (blacklist siempre gana)
    const telefonoNormalizado = normalizarNumeroE164(telefono);
    const bloqueado = await estaEnListaNegra(prisma, numeroReceptor.usuarioId, telefonoNormalizado);

    if (bloqueado) {
      console.log(`🚫 DECISIÓN: NO responder - Número ${telefono} está en lista negra del usuario ${numeroReceptor.usuario.nombre}`);
      return; // Blacklist gana, ignorar silenciosamente
    }

    // 3. Verificar lista blanca (whitelist)
    // Regla: si lista blanca vacía → atiende a todos, si tiene números → solo atiende a esos
    const debeAtender = await debeAtenderSegunListaBlanca(prisma, numeroReceptor.usuarioId, telefono);

    if (!debeAtender) {
      console.log(`📋 DECISIÓN: NO responder - Número ${telefono} no está en lista blanca del usuario ${numeroReceptor.usuario.nombre} (whitelist activa)`);
      return; // Ignorar silenciosamente
    }

    // Si llegamos aquí: no está en blacklist Y (whitelist vacía O está en whitelist) → ATENDER

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

    // Buscar conversación activa del mismo número WhatsApp receptor
    // FIX: NO filtrar por pasadoAHumano para evitar crear conversación nueva después AGENTE
    let conversacion = await prisma.conversacion.findFirst({
      where: {
        prospectoId: prospecto.id,
        numeroWhatsappId: numeroReceptor.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        mensajes: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
        prospecto: {
          include: {
            ejecutivo: true,
            inmobiliaria: true,
          },
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

      // Primer contacto: mensaje completo con saludo + disclosure + menú + hints
      const mensajeBienvenida = generarMensajeBienvenida(
        prospecto.inmobiliaria.nombre,
        prospecto.nombre
      );
      
      await prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          remitente: 'bot',
          contenido: mensajeBienvenida,
          esBot: true,
        },
      });

      console.log(`📤 DECISIÓN: Enviar mensaje de bienvenida completo (primer contacto) a ${telefono}`);
      await enviarMensajeWhatsApp(numeroReceptor, telefono, mensajeBienvenida, remoteJid);
      
      // Registrar actividad de primer contacto
      await prisma.actividad.create({
        data: {
          inmobiliariaId: prospecto.inmobiliariaId,
          prospectoId: prospecto.id,
          tipo: 'MENSAJE',
          titulo: 'Primer contacto WhatsApp',
          descripcion: `Primer mensaje del cliente: ${mensaje.substring(0, 100)}`,
        },
      });
      
      // Return: no generar segunda respuesta para primer contacto
      return;
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

    // Verificar si bot está pausado (escalamiento AGENTE)
    const ahora = new Date();
    if (conversacion.botPausadoHasta) {
      if (conversacion.botPausadoHasta > ahora) {
        // Bot pausado: guardar mensaje pero NO responder
        console.log(`⏸️ Bot pausado hasta ${conversacion.botPausadoHasta}. Mensaje guardado sin respuesta.`);
        return;
      } else {
        // Auto-resume: botPausadoHasta pasó
        console.log(`▶️ Auto-resume: botPausadoHasta ${conversacion.botPausadoHasta} expiró. Reactivando bot...`);
        conversacion = await prisma.conversacion.update({
          where: { id: conversacion.id },
          data: {
            botPausadoHasta: null,
            pasadoAHumano: false,
          },
          include: {
            mensajes: {
              take: 1,
              orderBy: { createdAt: 'asc' },
            },
            prospecto: {
              include: {
                ejecutivo: true,
                inmobiliaria: true,
              },
            },
          },
        });
      }
    }

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
      
      // Limpiar flujo activo si existe (abortar booking, etc.)
      if (conversacion.flujoBot) {
        console.log(`🔄 Abortando flujo activo: ${conversacion.flujoBot}`);
        await prisma.conversacion.update({
          where: { id: conversacion.id },
          data: {
            flujoBot: null,
            flujoEstado: null,
          },
        });
      }

      // Pausar bot: calcular botPausadoHasta
      const horasAutoresume = prospecto.inmobiliaria.horasAutoresumeBotPausa || 24;
      const botPausadoHasta = new Date(Date.now() + horasAutoresume * 3600000);

      await prisma.conversacion.update({
        where: { id: conversacion.id },
        data: {
          pasadoAHumano: true,
          botPausadoHasta,
        },
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

      // Obtener últimos 3 mensajes del cliente para contexto
      const ultimosMensajes = await prisma.mensaje.findMany({
        where: {
          conversacionId: conversacion.id,
          esBot: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      // Obtener propiedad de interés si existe
      let propiedadInteres = null;
      const interes = await prisma.interes.findFirst({
        where: { prospectoId: prospecto.id },
        include: { propiedad: true },
        orderBy: { createdAt: 'desc' },
      });
      if (interes) {
        propiedadInteres = interes.propiedad;
      }

      // Notificar asesor por WhatsApp
      const asesor = await notificarAsesorPorWhatsApp({
        numeroWhatsappId: numeroReceptor.id,
        prospecto: conversacion.prospecto,
        conversacion,
        propiedadInteres,
        ultimosMensajes: ultimosMensajes.reverse(),
      });

      // Crear notificación en panel + Socket.IO
      if (asesor) {
        await crearNotificacion({
          inmobiliariaId: prospecto.inmobiliariaId,
          usuarioId: asesor.id,
          tipo: 'AGENTE_SOLICITADO',
          titulo: `${prospecto.nombre} solicita atención`,
          mensaje: `El prospecto ${prospecto.nombre} (${prospecto.telefono}) solicitó hablar con un asesor.`,
          enlace: `/admin/conversaciones/${conversacion.id}`,
        });
      }

      const respuesta = `Perfecto, ${prospecto.nombre}. En breve uno de nuestros asesores se pondrá en contacto contigo. Gracias por tu interés.`;
      
      await prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          remitente: 'bot',
          contenido: respuesta,
          esBot: true,
        },
      });

      console.log(`📤 DECISIÓN: Enviar confirmación de solicitud AGENTE/HUMANO a ${telefono} (pausado hasta ${botPausadoHasta})`);
      await enviarMensajeWhatsApp(numeroReceptor, telefono, respuesta, remoteJid);
      return;
    }

    // Verificar si está en flujo activo (booking, etc.)
    const contexto = await obtenerContextoConversacion(conversacion.id, prospecto);
    
    if (conversacion.flujoBot === 'booking') {
      // Procesar flujo de booking
      const respuestaFlujo = await procesarFlujoCita(conversacion, mensaje, contexto);
      
      await prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          remitente: 'bot',
          contenido: respuestaFlujo,
          esBot: true,
        },
      });

      console.log(`📤 DECISIÓN: Responder flujo booking a ${telefono}`);
      await enviarMensajeWhatsApp(numeroReceptor, telefono, respuestaFlujo, remoteJid);
      return;
    }

    // Generar respuesta con IA
    let respuestaIA = await generarRespuestaIA(mensaje, contexto);

    // Detectar si IA quiere iniciar flujo booking
    if (respuestaIA === '__INICIAR_FLUJO_BOOKING__') {
      respuestaIA = await iniciarFlujoCita(conversacion, contexto);
    }

    // Detectar intent de gestionar cita existente
    if (mensajeNormalizado.includes('CITA') || mensajeNormalizado.includes('CANCELAR') || 
        mensajeNormalizado.includes('REAGENDAR')) {
      const tieneCitas = await prisma.cita.count({
        where: {
          prospectoId: prospecto.id,
          estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
          fecha: { gte: new Date() },
        },
      });
      
      if (tieneCitas > 0) {
        respuestaIA = await gestionarCitaExistente(conversacion, mensaje, contexto);
      }
    }

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
      estadoPropiedad: 'DISPONIBLE',
    },
    take: 20,
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

  // Encontrar última pregunta del bot para contexto
  const ultimaPreguntaBot = mensajes
    .filter(m => m.esBot && m.contenido.includes('?'))
    .slice(-1)[0]?.contenido || null;

  return {
    inmobiliaria: prospecto.inmobiliaria,
    prospecto: {
      id: prospecto.id,
      nombre: prospecto.nombre,
      presupuesto: prospecto.presupuesto,
      formaPago: prospecto.formaPago,
    },
    mensajesPrevios: mensajes.map(m => ({
      remitente: m.esBot ? 'bot' : 'cliente',
      contenido: m.contenido,
    })),
    ultimaPreguntaBot,
    propiedadesDisponibles: propiedades,
  };
}

async function enviarMensajeWhatsApp(numeroReceptor, telefonoDestino, mensaje, remoteJid = null) {
  // AI_PROVIDER=simulado solo controla si la IA es simulada, NO si los mensajes se envían
  // Para BAILEYS: siempre enviar mensajes reales (el bot está conectado)
  // Para otros proveedores sin implementación: simular por ahora
  const shouldSimulate = process.env.AI_PROVIDER === 'simulado' && numeroReceptor.proveedor !== 'BAILEYS';
  
  if (shouldSimulate) {
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
