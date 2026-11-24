import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generarMensajeBienvenida } from '../utils/botMessages.js';
import { generarRespuestaIA } from '../services/ia.service.js';
import { obtenerContextoConversacion } from '../services/whatsappBot.service.js';
import { iniciarFlujoCita, procesarFlujoCita } from '../services/citasFlow.service.js';

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
      (mensajeNormalizado === 'CANCELAR' && !conversacion.flujoBot) ||
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
    // Mismo motor que el bot real de WhatsApp (intents + flujo de citas), sin enviar nada
    else {
      const contexto = await obtenerContextoConversacion(conversacion.id, prospecto);
      if (conversacion.flujoBot === 'booking') {
        respuestaBot = await procesarFlujoCita(conversacion, mensaje, contexto);
      } else {
        respuestaBot = await generarRespuestaIA(mensaje, contexto);
        if (respuestaBot === '__INICIAR_FLUJO_BOOKING__') {
          respuestaBot = await iniciarFlujoCita(conversacion, contexto);
        }
      }
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

    // En primera interacción, solo enviar mensaje de bienvenida completo (no duplicar)
    const respuestas = esPrimeraInteraccion
      ? [generarMensajeBienvenida(prospecto.inmobiliaria.nombre, prospecto.nombre)]
      : [respuestaBot];

    res.json({
      success: true,
      respuesta: esPrimeraInteraccion 
        ? generarMensajeBienvenida(prospecto.inmobiliaria.nombre, prospecto.nombre)
        : respuestaBot,
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

export default router;
