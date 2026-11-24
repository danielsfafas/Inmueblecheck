import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Listar recordatorios
router.get('/', async (req, res, next) => {
  try {
    const { completado, vencidos } = req.query;

    const where = {
      inmobiliariaId: req.user.inmobiliariaId,
    };

    // Ejecutivos solo ven sus recordatorios
    if (req.user.rol === 'EJECUTIVO') {
      where.usuarioId = req.user.id;
    }

    if (completado !== undefined) {
      where.completado = completado === 'true';
    }

    if (vencidos === 'true') {
      where.fechaRecordatorio = {
        lt: new Date(),
      };
      where.completado = false;
    }

    const recordatorios = await prisma.recordatorio.findMany({
      where,
      include: {
        prospecto: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { fechaRecordatorio: 'asc' },
    });

    res.json(recordatorios);
  } catch (error) {
    next(error);
  }
});

// Crear recordatorio
router.post('/', async (req, res, next) => {
  try {
    const { prospectoId, titulo, descripcion, fechaRecordatorio } = req.body;

    if (!prospectoId || !titulo || !fechaRecordatorio) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar que el prospecto existe y pertenece a la inmobiliaria
    const prospecto = await prisma.prospecto.findFirst({
      where: {
        id: prospectoId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!prospecto) {
      return res.status(404).json({ error: 'Prospecto no encontrado' });
    }

    const recordatorio = await prisma.recordatorio.create({
      data: {
        inmobiliariaId: req.user.inmobiliariaId,
        prospectoId,
        usuarioId: req.user.id,
        titulo,
        descripcion,
        fechaRecordatorio: new Date(fechaRecordatorio),
      },
    });

    res.status(201).json(recordatorio);
  } catch (error) {
    next(error);
  }
});

// Marcar como completado
router.put('/:id/completar', async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = {
      id,
      inmobiliariaId: req.user.inmobiliariaId,
    };

    if (req.user.rol === 'EJECUTIVO') {
      where.usuarioId = req.user.id;
    }

    const recordatorio = await prisma.recordatorio.findFirst({ where });

    if (!recordatorio) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    const actualizado = await prisma.recordatorio.update({
      where: { id },
      data: { completado: true },
    });

    res.json(actualizado);
  } catch (error) {
    next(error);
  }
});

// Eliminar recordatorio
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = {
      id,
      inmobiliariaId: req.user.inmobiliariaId,
    };

    if (req.user.rol === 'EJECUTIVO') {
      where.usuarioId = req.user.id;
    }

    const recordatorio = await prisma.recordatorio.findFirst({ where });

    if (!recordatorio) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    await prisma.recordatorio.delete({
      where: { id },
    });

    res.json({ message: 'Recordatorio eliminado' });
  } catch (error) {
    next(error);
  }
});

export default router;
