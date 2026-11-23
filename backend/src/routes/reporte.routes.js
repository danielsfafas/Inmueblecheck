import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Reporte general
router.get('/general', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const where = {
      inmobiliariaId: req.user.inmobiliariaId,
    };

    if (fechaInicio || fechaFin) {
      where.createdAt = {};
      if (fechaInicio) where.createdAt.gte = new Date(fechaInicio);
      if (fechaFin) where.createdAt.lte = new Date(fechaFin);
    }

    const [
      prospectosNuevos,
      prospectosPorEtapa,
      prospectosPorCalificacion,
      actividadesPorTipo,
      propiedadesMasVistas,
    ] = await Promise.all([
      prisma.prospecto.count({ where }),
      
      prisma.prospecto.groupBy({
        by: ['etapa'],
        where,
        _count: true,
      }),
      
      prisma.prospecto.groupBy({
        by: ['calificacion'],
        where,
        _count: true,
      }),
      
      prisma.actividad.groupBy({
        by: ['tipo'],
        where,
        _count: true,
      }),
      
      prisma.propiedad.findMany({
        where: { inmobiliariaId: req.user.inmobiliariaId },
        select: {
          id: true,
          titulo: true,
          vistas: true,
          clicsWhatsapp: true,
        },
        orderBy: { vistas: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      prospectosNuevos,
      prospectosPorEtapa,
      prospectosPorCalificacion,
      actividadesPorTipo,
      propiedadesMasVistas,
    });
  } catch (error) {
    next(error);
  }
});

// Reporte por ejecutivo
router.get('/ejecutivos', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const ejecutivos = await prisma.usuario.findMany({
      where: {
        inmobiliariaId: req.user.inmobiliariaId,
        rol: 'EJECUTIVO',
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    const reportes = [];

    for (const ejecutivo of ejecutivos) {
      const where = {
        inmobiliariaId: req.user.inmobiliariaId,
        ejecutivoId: ejecutivo.id,
      };

      const whereActividades = {
        inmobiliariaId: req.user.inmobiliariaId,
        usuarioId: ejecutivo.id,
      };

      if (fechaInicio || fechaFin) {
        where.createdAt = {};
        whereActividades.createdAt = {};
        if (fechaInicio) {
          where.createdAt.gte = new Date(fechaInicio);
          whereActividades.createdAt.gte = new Date(fechaInicio);
        }
        if (fechaFin) {
          where.createdAt.lte = new Date(fechaFin);
          whereActividades.createdAt.lte = new Date(fechaFin);
        }
      }

      const [
        prospectosAsignados,
        prospectosNuevos,
        prospectosEnVisita,
        prospectosCerrados,
        llamadasRealizadas,
        visitasAgendadas,
      ] = await Promise.all([
        prisma.prospecto.count({
          where: {
            inmobiliariaId: req.user.inmobiliariaId,
            ejecutivoId: ejecutivo.id,
          },
        }),
        
        prisma.prospecto.count({ where }),
        
        prisma.prospecto.count({
          where: {
            ...where,
            etapa: 'VISITA',
          },
        }),
        
        prisma.prospecto.count({
          where: {
            ...where,
            etapa: 'CERRADO',
          },
        }),
        
        prisma.actividad.count({
          where: {
            ...whereActividades,
            tipo: 'LLAMADA',
          },
        }),
        
        prisma.actividad.count({
          where: {
            ...whereActividades,
            tipo: 'VISITA',
          },
        }),
      ]);

      reportes.push({
        ejecutivo: ejecutivo.nombre,
        prospectosAsignados,
        prospectosNuevos,
        prospectosEnVisita,
        prospectosCerrados,
        llamadasRealizadas,
        visitasAgendadas,
      });
    }

    res.json(reportes);
  } catch (error) {
    next(error);
  }
});

// Tiempo de respuesta promedio
router.get('/tiempo-respuesta', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const prospectos = await prisma.prospecto.findMany({
      where: {
        inmobiliariaId: req.user.inmobiliariaId,
        etapa: { not: 'NUEVO' },
      },
      include: {
        actividades: {
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    const tiempos = prospectos
      .filter(p => p.actividades.length > 0)
      .map(p => {
        const diff = p.actividades[0].createdAt - p.createdAt;
        return diff / (1000 * 60 * 60);
      });

    const promedio = tiempos.length > 0
      ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
      : 0;

    res.json({
      promedioHoras: promedio.toFixed(2),
      prospectosAnalizados: tiempos.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
