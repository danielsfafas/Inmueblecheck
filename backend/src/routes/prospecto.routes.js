import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Listar prospectos
router.get('/', async (req, res, next) => {
  try {
    const { etapa, calificacion, ejecutivoId } = req.query;

    const where = {
      inmobiliariaId: req.user.inmobiliariaId,
    };

    // Ejecutivos solo ven sus prospectos asignados
    if (req.user.rol === 'EJECUTIVO') {
      where.ejecutivoId = req.user.id;
    } else if (ejecutivoId) {
      where.ejecutivoId = ejecutivoId;
    }

    if (etapa) where.etapa = etapa;
    if (calificacion) where.calificacion = calificacion;

    const prospectos = await prisma.prospecto.findMany({
      where,
      include: {
        ejecutivo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        _count: {
          select: {
            actividades: true,
            intereses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(prospectos);
  } catch (error) {
    next(error);
  }
});

// Obtener un prospecto con historial completo
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = {
      id,
      inmobiliariaId: req.user.inmobiliariaId,
    };

    // Ejecutivos solo ven sus prospectos
    if (req.user.rol === 'EJECUTIVO') {
      where.ejecutivoId = req.user.id;
    }

    const prospecto = await prisma.prospecto.findFirst({
      where,
      include: {
        ejecutivo: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        actividades: {
          include: {
            usuario: {
              select: {
                nombre: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        conversaciones: {
          include: {
            mensajes: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        intereses: {
          include: {
            propiedad: {
              select: {
                id: true,
                titulo: true,
                precio: true,
                fotos: true,
              },
            },
          },
        },
        recordatorios: {
          where: {
            completado: false,
          },
          orderBy: { fechaRecordatorio: 'asc' },
        },
      },
    });

    if (!prospecto) {
      return res.status(404).json({ error: 'Prospecto no encontrado' });
    }

    res.json(prospecto);
  } catch (error) {
    next(error);
  }
});

// Actualizar prospecto
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      telefono,
      email,
      presupuesto,
      formaPago,
      creditoPreaprobado,
      calificacion,
      calificacionManual,
      etapa,
      ejecutivoId,
      noContactar,
      motivoBaja,
    } = req.body;

    const where = {
      id,
      inmobiliariaId: req.user.inmobiliariaId,
    };

    // Ejecutivos solo pueden actualizar sus prospectos
    if (req.user.rol === 'EJECUTIVO') {
      where.ejecutivoId = req.user.id;
    }

    const prospectoExistente = await prisma.prospecto.findFirst({ where });

    if (!prospectoExistente) {
      return res.status(404).json({ error: 'Prospecto no encontrado' });
    }

    const data = {};
    if (nombre) data.nombre = nombre;
    if (telefono) data.telefono = telefono;
    if (email !== undefined) data.email = email;
    if (presupuesto !== undefined) data.presupuesto = presupuesto ? parseFloat(presupuesto) : null;
    if (formaPago !== undefined) data.formaPago = formaPago;
    if (creditoPreaprobado !== undefined) data.creditoPreaprobado = creditoPreaprobado ? parseFloat(creditoPreaprobado) : null;
    if (calificacion) {
      data.calificacion = calificacion;
      data.calificacionManual = true;
    }
    if (calificacionManual !== undefined) data.calificacionManual = calificacionManual;
    if (ejecutivoId !== undefined) data.ejecutivoId = ejecutivoId;
    if (noContactar !== undefined) {
      data.noContactar = noContactar;
      if (noContactar) {
        data.fechaBaja = new Date();
      }
    }
    if (motivoBaja !== undefined) data.motivoBaja = motivoBaja;

    // Cambio de etapa
    if (etapa && etapa !== prospectoExistente.etapa) {
      data.etapa = etapa;

      // Registrar actividad de cambio de etapa
      await prisma.actividad.create({
        data: {
          inmobiliariaId: req.user.inmobiliariaId,
          prospectoId: id,
          usuarioId: req.user.id,
          tipo: 'CAMBIO_ETAPA',
          titulo: `Cambio de etapa: ${prospectoExistente.etapa} → ${etapa}`,
        },
      });
    }

    const prospecto = await prisma.prospecto.update({
      where: { id },
      data,
    });

    res.json(prospecto);
  } catch (error) {
    next(error);
  }
});

// Asignar prospecto a ejecutivo
router.post('/:id/asignar', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ejecutivoId } = req.body;

    const prospecto = await prisma.prospecto.update({
      where: {
        id,
        inmobiliariaId: req.user.inmobiliariaId,
      },
      data: {
        ejecutivoId,
      },
    });

    await prisma.actividad.create({
      data: {
        inmobiliariaId: req.user.inmobiliariaId,
        prospectoId: id,
        usuarioId: req.user.id,
        tipo: 'NOTA',
        titulo: 'Prospecto asignado',
        descripcion: `Asignado a ejecutivo ID: ${ejecutivoId}`,
      },
    });

    res.json(prospecto);
  } catch (error) {
    next(error);
  }
});

// Registrar actividad
router.post('/:id/actividades', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tipo, titulo, descripcion } = req.body;

    const where = {
      id,
      inmobiliariaId: req.user.inmobiliariaId,
    };

    if (req.user.rol === 'EJECUTIVO') {
      where.ejecutivoId = req.user.id;
    }

    const prospecto = await prisma.prospecto.findFirst({ where });

    if (!prospecto) {
      return res.status(404).json({ error: 'Prospecto no encontrado' });
    }

    const actividad = await prisma.actividad.create({
      data: {
        inmobiliariaId: req.user.inmobiliariaId,
        prospectoId: id,
        usuarioId: req.user.id,
        tipo,
        titulo,
        descripcion,
      },
    });

    res.status(201).json(actividad);
  } catch (error) {
    next(error);
  }
});

// Marcar interés en propiedad
router.post('/:id/intereses', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { propiedadId } = req.body;

    const interes = await prisma.interes.create({
      data: {
        prospectoId: id,
        propiedadId,
      },
    });

    res.status(201).json(interes);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(200).json({ message: 'Interés ya registrado' });
    }
    next(error);
  }
});

export default router;
