import express from 'express';
import { prisma, redis } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';
import { procesarMensajeBot } from '../services/whatsappBot.service.js';

const router = express.Router();

// Webhook de verificación (Meta)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook de mensajes entrantes
router.post('/webhook', async (req, res) => {
  try {
    res.sendStatus(200);

    const { entry } = req.body;

    if (!entry || !entry[0]) {
      return;
    }

    const changes = entry[0].changes;
    if (!changes || !changes[0]) {
      return;
    }

    const value = changes[0].value;
    const messages = value.messages;

    if (!messages || !messages[0]) {
      return;
    }

    const message = messages[0];
    const from = message.from;
    const text = message.text?.body?.trim();

    if (!text) {
      return;
    }

    await procesarMensajeBot(from, text);
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error);
  }
});

// Pasar conversación a humano
router.post('/conversaciones/:id/pasar-humano', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversacion = await prisma.conversacion.findFirst({
      where: {
        id,
        inmobiliariaId: req.user.inmobiliariaId,
      },
      include: {
        prospecto: true,
        mensajes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversacion) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Generar resumen de la conversación
    const resumen = generarResumenConversacion(conversacion.mensajes);

    await prisma.conversacion.update({
      where: { id },
      data: {
        pasadoAHumano: true,
        resumenBot: resumen,
      },
    });

    // Registrar actividad
    await prisma.actividad.create({
      data: {
        inmobiliariaId: req.user.inmobiliariaId,
        prospectoId: conversacion.prospectoId,
        usuarioId: req.user.id,
        tipo: 'NOTA',
        titulo: 'Conversación tomada por ejecutivo',
        descripcion: `Resumen del bot:\n${resumen}`,
      },
    });

    res.json({ message: 'Conversación pasada a humano', resumen });
  } catch (error) {
    next(error);
  }
});

function generarResumenConversacion(mensajes) {
  const lineas = [];
  
  for (const msg of mensajes) {
    const emisor = msg.esBot ? 'Bot' : 'Cliente';
    const contenido = msg.contenido.length > 100 
      ? msg.contenido.substring(0, 100) + '...' 
      : msg.contenido;
    lineas.push(`${emisor}: ${contenido}`);
  }

  return lineas.join('\n');
}

export default router;
