import express from 'express';
import { prisma } from '../index.js';
import { verificarToken } from '../middleware/auth.js';
import { marcarNotificacionesLeidas } from '../services/notificaciones.service.js';

const router = express.Router();

/**
 * GET /api/notificaciones
 * Obtener notificaciones del usuario actual
 */
router.get('/', verificarToken, async (req, res) => {
  try {
    const { id: usuarioId, inmobiliariaId } = req.usuario;
    const { leida, limit = 50 } = req.query;

    const where = {
      usuarioId,
      inmobiliariaId,
    };

    if (leida !== undefined) {
      where.leida = leida === 'true';
    }

    const notificaciones = await prisma.notificacion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    const noLeidas = await prisma.notificacion.count({
      where: {
        usuarioId,
        inmobiliariaId,
        leida: false,
      },
    });

    res.json({
      notificaciones,
      noLeidas,
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

/**
 * PATCH /api/notificaciones/marcar-leidas
 * Marcar notificaciones como leídas
 */
router.patch('/marcar-leidas', verificarToken, async (req, res) => {
  try {
    const { id: usuarioId } = req.usuario;
    const { notificacionIds } = req.body;

    if (!notificacionIds || !Array.isArray(notificacionIds)) {
      return res.status(400).json({ error: 'notificacionIds debe ser un array' });
    }

    await marcarNotificacionesLeidas(usuarioId, notificacionIds);

    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error marcando notificaciones leídas:', error);
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
});

/**
 * PATCH /api/notificaciones/marcar-todas-leidas
 * Marcar todas las notificaciones como leídas
 */
router.patch('/marcar-todas-leidas', verificarToken, async (req, res) => {
  try {
    const { id: usuarioId, inmobiliariaId } = req.usuario;

    await prisma.notificacion.updateMany({
      where: {
        usuarioId,
        inmobiliariaId,
        leida: false,
      },
      data: {
        leida: true,
        leidaAt: new Date(),
      },
    });

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error marcando todas leídas:', error);
    res.status(500).json({ error: 'Error al marcar todas leídas' });
  }
});

export default router;
