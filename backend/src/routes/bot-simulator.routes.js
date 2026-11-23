import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generarMensajeBienvenida } from '../utils/botMessages.js';

const router = express.Router();

// Solo administradores pueden usar el simulador
router.use(authenticateToken);
router.use(requireRole('ADMIN', 'SUPERVISOR'));

// Simular mensaje del bot (admin-only, sin envío real de WhatsApp)
router.post('/mensaje', async (req, res, next) => {
  try {
    const { mensaje, resetear, telefono } = req.body;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    const inmobiliariaId = req.user.inmobiliariaId;
    const telefonoSimulado = telefono || 'SIMULADOR_TEST';

    // Buscar o crear prospecto de prueba
    let prospecto = await prisma.prospecto.findFirst({
      where: {
        telefono: telefonoSimulado,
        inmobiliariaId,
      },
      include: { inmobiliaria: true },
    });

    if (!prospecto || resetear) {
      // Eliminar prospecto anterior si existe
      if (prospecto && resetear) {
        await prisma.conversacion.deleteMany({
          where: { prospectoId: prospecto.id },
        });
        await prisma.prospecto.delete({
          where: { id: prospecto.id },
        });
      }

      // Crear nuevo prospecto de prueba
      prospecto = await prisma.prospecto.create({
        data: {
          inmobiliariaId,
          nombre: 'Usuario de Prueba',
          telefono: telefonoSimulado,
          origen: 'Simulador',
          etapa: 'NUEVO',
          calificacion: 'FRIO',
        },
        include: { inmobiliaria: true },
      });
    }

    // Buscar o crear conversación activa
    let conversacion = await prisma.conversacion.findFirst({
      where: {
        prospectoId: prospecto.id,
        pasadoAHumano: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        mensajes: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    const esPrimeraInteraccion = !conversacion;

    if (!conversacion) {
      conversacion = await prisma.conversacion.create({
        data: {
          inmobiliariaId,
          prospectoId: prospecto.id,
          plataforma: 'simulador',
          idExterno: 'SIMULADOR',
          atendidoPorBot: true,
          pasadoAHumano: false,
        },
        include: {
          mensajes: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // Mensaje de bienvenida con divulgación de IA (requisito legal)
      const mensajeBienvenida = generarMensajeBienvenida(prospecto.inmobiliaria.nombre);

      await prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          remitente: 'bot',
          contenido: mensajeBienvenida,
          esBot: true,
        },
      });

      conversacion.mensajes.push({
        conversacionId: conversacion.id,
        remitente: 'bot',
        contenido: mensajeBienvenida,
        esBot: true,
        createdAt: new Date(),
      });
    }

    // Guardar mensaje del usuario
    await prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        remitente: 'SIMULADOR_TEST',
        contenido: mensaje,
        esBot: false,
      },
    });

    // Detectar comandos especiales
    const mensajeNormalizado = mensaje.toUpperCase().trim();
    let respuestaBot;
    let pasadoAHumano = false;
    let dadoDeBaja = false;

    // Comando BAJA
    if (
      mensajeNormalizado === 'BAJA' ||
      mensajeNormalizado === 'STOP' ||
      mensajeNormalizado === 'CANCELAR' ||
      mensajeNormalizado === 'NO MAS' ||
      mensajeNormalizado.includes('NO CONTACTAR')
    ) {
      await prisma.prospecto.update({
        where: { id: prospecto.id },
        data: {
          noContactar: true,
          motivoBaja: 'Solicitado en simulador',
          fechaBaja: new Date(),
        },
      });

      await prisma.consentimiento.create({
        data: {
          inmobiliariaId,
          prospectoId: prospecto.id,
          titular: prospecto.nombre,
          tipo: 'OPTIN_WHATSAPP_MARKETING',
          accion: 'BAJA',
          versionDocumento: '1.0',
          textoHash: '',
          canal: 'simulador',
        },
      });

      respuestaBot =
        `Entendido, ${prospecto.nombre}. Has sido dado de baja de nuestra lista de contactos. ` +
        `No recibirás más mensajes promocionales de ${prospecto.inmobiliaria.nombre}. Gracias por tu tiempo.`;
      dadoDeBaja = true;
    }
    // Comando AGENTE
    else if (
      mensajeNormalizado === 'AGENTE' ||
      mensajeNormalizado === 'HUMANO' ||
      mensajeNormalizado === 'ASESOR' ||
      mensajeNormalizado.includes('HABLAR CON')
    ) {
      await prisma.conversacion.update({
        where: { id: conversacion.id },
        data: {
          pasadoAHumano: true,
          resumenBot: 'Cliente solicitó atención personal',
        },
      });

      // Crear actividad de pase a humano
      await prisma.actividad.create({
        data: {
          inmobiliariaId,
          prospectoId: prospecto.id,
          usuarioId: req.user.id,
          tipo: 'NOTA',
          titulo: 'Pase a ejecutivo desde simulador',
          descripcion: 'El prospecto solicitó hablar con un ejecutivo humano',
        },
      });

      respuestaBot =
        `Por supuesto, te voy a conectar con uno de nuestros ejecutivos. Un momento, por favor...\n\n` +
        `✅ Has sido transferido a ${req.user.nombre}. En breve te contactará.`;
      pasadoAHumano = true;
    }
    // Respuestas automáticas inteligentes
    else {
      respuestaBot = generarRespuestaAutomatica(mensaje, prospecto.inmobiliaria);
    }

    // Guardar respuesta del bot
    await prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        remitente: 'bot',
        contenido: respuestaBot,
        esBot: true,
      },
    });

    // En primera interacción, enviar tanto el mensaje de bienvenida como la respuesta
    const respuestas = esPrimeraInteraccion
      ? [generarMensajeBienvenida(prospecto.inmobiliaria.nombre), respuestaBot]
      : [respuestaBot];

    res.json({
      success: true,
      respuesta: respuestaBot, // mantener para backward compatibility
      respuestas, // array de mensajes a mostrar
      pasadoAHumano,
      dadoDeBaja,
      esPrimeraInteraccion,
      conversacionId: conversacion.id,
      prospectoId: prospecto.id,
    });
  } catch (error) {
    next(error);
  }
});

// Función auxiliar para generar respuestas automáticas
function generarRespuestaAutomatica(mensaje, inmobiliaria) {
  const mensajeLower = mensaje.toLowerCase();

  // Consultas sobre propiedades
  if (
    mensajeLower.includes('casa') ||
    mensajeLower.includes('propiedad') ||
    mensajeLower.includes('departamento') ||
    mensajeLower.includes('terreno')
  ) {
    return (
      'Tenemos varias opciones disponibles:\n\n' +
      '🏠 Casas en venta desde $950,000\n' +
      '🏢 Departamentos en renta desde $4,500/mes\n' +
      '🏘️ Terrenos desde $950,000\n\n' +
      '¿Te gustaría ver alguna en específico? También puedo conectarte con un ejecutivo para una asesoría personalizada. ' +
      'Escribe AGENTE para hablar con una persona.'
    );
  }

  // Consultas sobre créditos
  if (
    mensajeLower.includes('crédito') ||
    mensajeLower.includes('infonavit') ||
    mensajeLower.includes('bancario') ||
    mensajeLower.includes('fovissste') ||
    mensajeLower.includes('financiamiento')
  ) {
    return (
      'Aceptamos diferentes formas de pago:\n\n' +
      '✅ Contado\n' +
      '✅ Crédito bancario\n' +
      '✅ Infonavit\n' +
      '✅ Fovissste\n\n' +
      'La mayoría de nuestras propiedades califican para créditos. ' +
      '¿Te gustaría que un ejecutivo te explique las opciones específicas para tu situación? ' +
      'Escribe AGENTE.'
    );
  }

  // Consultas sobre precios
  if (
    mensajeLower.includes('precio') ||
    mensajeLower.includes('costo') ||
    mensajeLower.includes('cuanto') ||
    mensajeLower.includes('cuánto')
  ) {
    return (
      'Nuestros precios varían según la propiedad:\n\n' +
      '💰 Casas: desde $950,000 hasta $3,850,000\n' +
      '💰 Departamentos en renta: desde $4,500/mes\n' +
      '💰 Terrenos: desde $950,000\n\n' +
      '¿Te interesa alguna en particular? Puedo darte más detalles o conectarte con un ejecutivo. ' +
      'Escribe AGENTE para asesoría personalizada.'
    );
  }

  // Respuesta genérica
  return (
    'Gracias por tu mensaje. 🤖 Soy un asistente automatizado y estoy aquí para ayudarte con:\n\n' +
    '📋 Información sobre propiedades disponibles\n' +
    '💳 Opciones de crédito y financiamiento\n' +
    '📍 Ubicaciones y características\n' +
    '👤 Conectarte con un ejecutivo\n\n' +
    '¿En qué te gustaría que te ayude? O escribe AGENTE para hablar con una persona.'
  );
}

export default router;
