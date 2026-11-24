import express from 'express';
import { prisma } from '../index.js';
import { verificarToken } from '../middleware/auth.js';
import { obtenerSlotsDisponibles } from '../services/citas.service.js';
import { parseISO, startOfDay, addDays } from 'date-fns';

const router = express.Router();

/**
 * GET /api/horarios
 * Obtener horarios de la semana
 */
router.get('/', verificarToken, async (req, res) => {
  try {
    const { inmobiliariaId } = req.usuario;

    const horarios = await prisma.horarioCitas.findMany({
      where: { inmobiliariaId },
      orderBy: { diaSemana: 'asc' },
    });

    // Si no hay horarios, devolver defaults
    if (horarios.length === 0) {
      const defaults = [
        { diaSemana: 1, nombre: 'Lunes', activo: true, horaInicio: '09:00', horaFin: '18:00', pausaInicio: '14:00', pausaFin: '15:00' },
        { diaSemana: 2, nombre: 'Martes', activo: true, horaInicio: '09:00', horaFin: '18:00', pausaInicio: '14:00', pausaFin: '15:00' },
        { diaSemana: 3, nombre: 'Miércoles', activo: true, horaInicio: '09:00', horaFin: '18:00', pausaInicio: '14:00', pausaFin: '15:00' },
        { diaSemana: 4, nombre: 'Jueves', activo: true, horaInicio: '09:00', horaFin: '18:00', pausaInicio: '14:00', pausaFin: '15:00' },
        { diaSemana: 5, nombre: 'Viernes', activo: true, horaInicio: '09:00', horaFin: '18:00', pausaInicio: '14:00', pausaFin: '15:00' },
        { diaSemana: 6, nombre: 'Sábado', activo: true, horaInicio: '09:00', horaFin: '14:00', pausaInicio: null, pausaFin: null },
        { diaSemana: 7, nombre: 'Domingo', activo: false, horaInicio: '09:00', horaFin: '14:00', pausaInicio: null, pausaFin: null },
      ];
      return res.json(defaults);
    }

    res.json(horarios);
  } catch (error) {
    console.error('Error obteniendo horarios:', error);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

/**
 * PUT /api/horarios/:diaSemana
 * Actualizar horario de un día
 */
router.put('/:diaSemana', verificarToken, async (req, res) => {
  try {
    const { diaSemana } = req.params;
    const { inmobiliariaId } = req.usuario;
    const { activo, horaInicio, horaFin, pausaInicio, pausaFin } = req.body;

    const dia = parseInt(diaSemana);
    if (dia < 1 || dia > 7) {
      return res.status(400).json({ error: 'Día de semana inválido (1-7)' });
    }

    const horario = await prisma.horarioCitas.upsert({
      where: {
        inmobiliariaId_diaSemana: {
          inmobiliariaId,
          diaSemana: dia,
        },
      },
      update: {
        activo,
        horaInicio,
        horaFin,
        pausaInicio,
        pausaFin,
      },
      create: {
        inmobiliariaId,
        diaSemana: dia,
        activo,
        horaInicio,
        horaFin,
        pausaInicio,
        pausaFin,
      },
    });

    res.json(horario);
  } catch (error) {
    console.error('Error actualizando horario:', error);
    res.status(500).json({ error: 'Error al actualizar horario' });
  }
});

/**
 * GET /api/horarios/cierres
 * Listar cierres de calendario
 */
router.get('/cierres/list', verificarToken, async (req, res) => {
  try {
    const { inmobiliariaId } = req.usuario;
    const { fechaInicio, fechaFin } = req.query;

    const where = { inmobiliariaId };

    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) {
        where.fecha.gte = parseISO(fechaInicio);
      }
      if (fechaFin) {
        where.fecha.lte = addDays(parseISO(fechaFin), 1);
      }
    }

    const cierres = await prisma.cierreCalendario.findMany({
      where,
      orderBy: { fecha: 'asc' },
    });

    res.json(cierres);
  } catch (error) {
    console.error('Error obteniendo cierres:', error);
    res.status(500).json({ error: 'Error al obtener cierres' });
  }
});

/**
 * POST /api/horarios/cierres
 * Crear cierre de calendario
 */
router.post('/cierres', verificarToken, async (req, res) => {
  try {
    const { inmobiliariaId } = req.usuario;
    const { fecha, diaCompleto, horaInicio, horaFin, motivo } = req.body;

    if (!fecha || !motivo) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const cierre = await prisma.cierreCalendario.create({
      data: {
        inmobiliariaId,
        fecha: parseISO(fecha),
        diaCompleto: diaCompleto ?? true,
        horaInicio,
        horaFin,
        motivo,
      },
    });

    res.status(201).json(cierre);
  } catch (error) {
    console.error('Error creando cierre:', error);
    res.status(500).json({ error: 'Error al crear cierre' });
  }
});

/**
 * DELETE /api/horarios/cierres/:id
 * Eliminar cierre
 */
router.delete('/cierres/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { inmobiliariaId } = req.usuario;

    await prisma.cierreCalendario.deleteMany({
      where: { id, inmobiliariaId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando cierre:', error);
    res.status(500).json({ error: 'Error al eliminar cierre' });
  }
});

/**
 * GET /api/horarios/slots
 * Obtener slots disponibles para una fecha
 */
router.get('/slots', verificarToken, async (req, res) => {
  try {
    const { inmobiliariaId } = req.usuario;
    const { fecha, propiedadId } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }

    const fechaObj = parseISO(fecha);
    const result = await obtenerSlotsDisponibles(inmobiliariaId, fechaObj, propiedadId);

    res.json(result);
  } catch (error) {
    console.error('Error obteniendo slots:', error);
    res.status(500).json({ error: 'Error al obtener slots' });
  }
});

/**
 * GET /api/horarios/configuracion
 * Obtener configuración general de citas
 */
router.get('/configuracion', verificarToken, async (req, res) => {
  try {
    const { inmobiliariaId } = req.usuario;

    const inmobiliaria = await prisma.inmobiliaria.findUnique({
      where: { id: inmobiliariaId },
      select: {
        duracionCitaMin: true,
        tiempoAntelacionMin: true,
        diasConCitasAdelante: true,
        horasAutoresumeBotPausa: true,
      },
    });

    res.json(inmobiliaria);
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

/**
 * PATCH /api/horarios/configuracion
 * Actualizar configuración general
 */
router.patch('/configuracion', verificarToken, async (req, res) => {
  try {
    const { inmobiliariaId } = req.usuario;
    const { duracionCitaMin, tiempoAntelacionMin, diasConCitasAdelante, horasAutoresumeBotPausa } = req.body;

    const updates = {};
    if (duracionCitaMin !== undefined) updates.duracionCitaMin = duracionCitaMin;
    if (tiempoAntelacionMin !== undefined) updates.tiempoAntelacionMin = tiempoAntelacionMin;
    if (diasConCitasAdelante !== undefined) updates.diasConCitasAdelante = diasConCitasAdelante;
    if (horasAutoresumeBotPausa !== undefined) updates.horasAutoresumeBotPausa = horasAutoresumeBotPausa;

    const inmobiliaria = await prisma.inmobiliaria.update({
      where: { id: inmobiliariaId },
      data: updates,
      select: {
        duracionCitaMin: true,
        tiempoAntelacionMin: true,
        diasConCitasAdelante: true,
        horasAutoresumeBotPausa: true,
      },
    });

    res.json(inmobiliaria);
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

export default router;
