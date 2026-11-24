import express from 'express';
import { prisma, io } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendBaileysMessage } from '../services/baileys.service.js';

const router = express.Router();

/**
 * GET /api/conversaciones
 * Listar conversaciones con filtros
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    const { inmobiliariaId, rol } = req.user;

    const where = {
      inmobiliariaId,
    };

    // Filtro por status
    if (status === 'bot_activo') {
      where.pasadoAHumano = false;
      where.botPausadoHasta = null;
    } else if (status === 'pausado') {
      where.botPausadoHasta = { not: null };
    } else if (status === 'pasado_humano') {
      where.pasadoAHumano = true;
    }

    // Filtro por teléfono o nombre prospecto
    if (search) {
      where.OR = [
        { prospecto: { telefono: { contains: search, mode: 'insensitive' } } },
        { prospecto: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const conversaciones = await prisma.conversacion.findMany({
      where,
      include: {
        prospecto: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },
        mensajes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        numeroWhatsapp: {
          select: {
            nombre: true,
            numero: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Formatear respuesta
    const conversacionesFormateadas = conversaciones.map((conv) => {
      const ultimoMensaje = conv.mensajes[0];
      
      // Determinar status
      let statusConv = 'bot_activo';
      if (conv.botPausadoHasta && conv.botPausadoHasta > new Date()) {
        statusConv = 'pausado';
      } else if (conv.pasadoAHumano) {
        statusConv = 'pasado_humano';
      }

      return {
        id: conv.id,
        prospectoId: conv.prospecto.id,
        prospectoNombre: conv.prospecto.nombre,
        prospectoTelefono: conv.prospecto.telefono,
        numeroWhatsapp: conv.numeroWhatsapp?.nombre || conv.numeroWhatsapp?.numero,
        ultimoMensaje: ultimoMensaje
          ? {
              contenido: ultimoMensaje.contenido.substring(0, 100),
              fecha: ultimoMensaje.createdAt,
              esBot: ultimoMensaje.esBot,
            }
          : null,
        status: statusConv,
        botPausadoHasta: conv.botPausadoHasta,
        pasadoAHumano: conv.pasadoAHumano,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      };
    });

    res.json(conversacionesFormateadas);
  } catch (error) {
    console.error('Error listando conversaciones:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
});

/**
 * GET /api/conversaciones/:id
 * Detalle de conversación con mensajes
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { inmobiliariaId } = req.user;

    const conversacion = await prisma.conversacion.findFirst({
      where: {
        id,
        inmobiliariaId,
      },
      include: {
        prospecto: {
          include: {
            ejecutivo: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
          },
        },
        mensajes: {
          orderBy: { createdAt: 'asc' },
        },
        numeroWhatsapp: {
          select: {
            id: true,
            nombre: true,
            numero: true,
            proveedor: true,
          },
        },
      },
    });

    if (!conversacion) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Determinar status
    let status = 'bot_activo';
    if (conversacion.botPausadoHasta && conversacion.botPausadoHasta > new Date()) {
      status = 'pausado';
    } else if (conversacion.pasadoAHumano) {
      status = 'pasado_humano';
    }

    res.json({
      ...conversacion,
      status,
    });
  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
});

/**
 * POST /api/conversaciones/:id/reactivar-bot
 * Reactivar bot (quitar pausa)
 */
router.post('/:id/reactivar-bot', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { inmobiliariaId } = req.user;

    const conversacion = await prisma.conversacion.findFirst({
      where: { id, inmobiliariaId },
      include: { prospecto: true },
    });

    if (!conversacion) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const updated = await prisma.conversacion.update({
      where: { id },
      data: {
        botPausadoHasta: null,
        pasadoAHumano: false,
      },
      include: {
        prospecto: true,
        mensajes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Registrar actividad
    await prisma.actividad.create({
      data: {
        inmobiliariaId,
        prospectoId: conversacion.prospectoId,
        tipo: 'NOTA',
        titulo: 'Bot reactivado',
        descripcion: `Bot reactivado por ${req.user.nombre}`,
        usuarioId: req.user.id,
      },
    });

    // Emit Socket.IO
    if (io) {
      io.to(`inmobiliaria-${inmobiliariaId}`).emit('conversacion-actualizada', {
        conversacionId: id,
        status: 'bot_activo',
      });
    }

    res.json({
      message: 'Bot reactivado exitosamente',
      conversacion: updated,
    });
  } catch (error) {
    console.error('Error reactivando bot:', error);
    res.status(500).json({ error: 'Error al reactivar bot' });
  }
});

/**
 * POST /api/conversaciones/:id/pausar-bot
 * Pausar bot (manual)
 */
router.post('/:id/pausar-bot', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { horas = 24 } = req.body;
    const { inmobiliariaId } = req.user;

    const conversacion = await prisma.conversacion.findFirst({
      where: { id, inmobiliariaId },
      include: { prospecto: { include: { inmobiliaria: true } } },
    });

    if (!conversacion) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const horasPausa = horas || conversacion.prospecto.inmobiliaria.horasAutoresumeBotPausa || 24;
    const botPausadoHasta = new Date(Date.now() + horasPausa * 3600000);

    const updated = await prisma.conversacion.update({
      where: { id },
      data: {
        botPausadoHasta,
        pasadoAHumano: true,
      },
      include: {
        prospecto: true,
        mensajes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Registrar actividad
    await prisma.actividad.create({
      data: {
        inmobiliariaId,
        prospectoId: conversacion.prospectoId,
        tipo: 'NOTA',
        titulo: 'Bot pausado',
        descripcion: `Bot pausado por ${req.user.nombre} hasta ${botPausadoHasta.toISOString()}`,
        usuarioId: req.user.id,
      },
    });

    // Emit Socket.IO
    if (io) {
      io.to(`inmobiliaria-${inmobiliariaId}`).emit('conversacion-actualizada', {
        conversacionId: id,
        status: 'pausado',
        botPausadoHasta,
      });
    }

    res.json({
      message: 'Bot pausado exitosamente',
      conversacion: updated,
    });
  } catch (error) {
    console.error('Error pausando bot:', error);
    res.status(500).json({ error: 'Error al pausar bot' });
  }
});

/**
 * POST /api/conversaciones/:id/enviar-mensaje
 * Enviar mensaje manual del asesor por WhatsApp
 */
router.post('/:id/enviar-mensaje', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;
    const { inmobiliariaId } = req.user;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ error: 'Contenido del mensaje requerido' });
    }

    const conversacion = await prisma.conversacion.findFirst({
      where: { id, inmobiliariaId },
      include: {
        prospecto: true,
        numeroWhatsapp: true,
      },
    });

    if (!conversacion) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    if (!conversacion.numeroWhatsapp) {
      return res.status(400).json({ error: 'Número WhatsApp no disponible' });
    }

    // Guardar mensaje como asesor
    const mensaje = await prisma.mensaje.create({
      data: {
        conversacionId: id,
        remitente: 'asesor',
        contenido,
        esBot: false,
      },
    });

    // Enviar WhatsApp via Baileys
    if (conversacion.numeroWhatsapp.proveedor === 'BAILEYS') {
      await sendBaileysMessage(
        conversacion.numeroWhatsapp.id,
        conversacion.prospecto.telefono.replace(/\D/g, ''),
        contenido,
        conversacion.idExterno
      );
    } else {
      console.warn(`Proveedor ${conversacion.numeroWhatsapp.proveedor} no soportado para envío manual`);
    }

    // Registrar actividad
    await prisma.actividad.create({
      data: {
        inmobiliariaId,
        prospectoId: conversacion.prospectoId,
        tipo: 'MENSAJE',
        titulo: 'Mensaje manual enviado',
        descripcion: `${req.user.nombre} envió: ${contenido.substring(0, 100)}`,
        usuarioId: req.user.id,
      },
    });

    // Emit Socket.IO para actualizar chat en tiempo real
    if (io) {
      io.to(`conversacion-${id}`).emit('mensaje-nuevo', {
        conversacionId: id,
        mensaje: {
          id: mensaje.id,
          remitente: 'asesor',
          contenido: mensaje.contenido,
          createdAt: mensaje.createdAt,
          esBot: false,
        },
      });
    }

    res.json({
      message: 'Mensaje enviado exitosamente',
      mensaje,
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

export default router;
