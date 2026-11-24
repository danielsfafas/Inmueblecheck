import express from 'express';
import { prisma, io } from '../index.js';
import { verificarToken } from '../middleware/auth.js';
import { validarSlotDisponible, asignarAsesorLibre } from '../services/citas.service.js';
import { crearNotificacion } from '../services/notificaciones.service.js';
import { sendBaileysMessage } from '../services/baileys.service.js';
import { startOfDay, addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const router = express.Router();

/**
 * GET /api/citas
 * Listar citas con filtros
 */
router.get('/', verificarToken, async (req, res) => {
  try {
    const { inmobiliariaId } = req.usuario;
    const { estado, asesorId, propiedadId, fechaInicio, fechaFin } = req.query;

    const where = { inmobiliariaId };

    if (estado) {
      where.estado = estado;
    }

    if (asesorId) {
      where.asesorId = asesorId;
    }

    if (propiedadId) {
      where.propiedadId = propiedadId;
    }

    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) {
        where.fecha.gte = parseISO(fechaInicio);
      }
      if (fechaFin) {
        where.fecha.lte = addDays(parseISO(fechaFin), 1);
      }
    }

    const citas = await prisma.cita.findMany({
      where,
      include: {
        prospecto: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },
        propiedad: {
          select: {
            id: true,
            titulo: true,
            colonia: true,
          },
        },
        asesor: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    });

    res.json(citas);
  } catch (error) {
    console.error('Error listando citas:', error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

/**
 * GET /api/citas/:id
 * Detalle de cita
 */
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { inmobiliariaId } = req.usuario;

    const cita = await prisma.cita.findFirst({
      where: { id, inmobiliariaId },
      include: {
        prospecto: true,
        propiedad: true,
        asesor: true,
      },
    });

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    res.json(cita);
  } catch (error) {
    console.error('Error obteniendo cita:', error);
    res.status(500).json({ error: 'Error al obtener cita' });
  }
});

/**
 * POST /api/citas
 * Crear cita manual (admin)
 */
router.post('/', verificarToken, async (req, res) => {
  try {
    const { inmobiliariaId, id: usuarioId } = req.usuario;
    const { prospectoId, propiedadId, asesorId, fecha, hora, notas } = req.body;

    if (!prospectoId || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Validar slot
    const fechaObj = typeof fecha === 'string' ? parseISO(fecha) : fecha;
    const validacion = await validarSlotDisponible(
      inmobiliariaId,
      fechaObj,
      hora,
      propiedadId,
      asesorId
    );

    if (!validacion.valido) {
      return res.status(409).json({ error: validacion.error });
    }

    // Asignar asesor si no viene
    let asesorFinal = asesorId;
    if (!asesorFinal) {
      const asesorLibre = await asignarAsesorLibre(inmobiliariaId, fechaObj, hora);
      asesorFinal = asesorLibre?.id;
    }

    const inmobiliaria = await prisma.inmobiliaria.findUnique({
      where: { id: inmobiliariaId },
      select: { duracionCitaMin: true },
    });

    // Crear cita CONFIRMADA (creada desde admin)
    const cita = await prisma.cita.create({
      data: {
        inmobiliariaId,
        prospectoId,
        propiedadId,
        asesorId: asesorFinal,
        fecha: fechaObj,
        hora,
        duracionMin: inmobiliaria.duracionCitaMin || 60,
        estado: 'CONFIRMADA',
        origen: 'ADMIN',
        notas,
        confirmadaAt: new Date(),
      },
      include: {
        prospecto: true,
        propiedad: true,
        asesor: true,
      },
    });

    // Crear actividad
    await prisma.actividad.create({
      data: {
        inmobiliariaId,
        prospectoId,
        tipo: 'VISITA',
        titulo: 'Cita creada desde admin',
        descripcion: `${format(fechaObj, 'dd/MM/yyyy')} a las ${hora}`,
        usuarioId,
      },
    });

    // Mover prospecto a etapa VISITA
    const prospecto = await prisma.prospecto.findUnique({
      where: { id: prospectoId },
    });

    if (['NUEVO', 'CONTACTADO'].includes(prospecto.etapa)) {
      await prisma.prospecto.update({
        where: { id: prospectoId },
        data: { etapa: 'VISITA' },
      });
    }

    // Notificar asesor si tiene teléfono
    if (cita.asesor?.telefonoWhatsapp) {
      const fechaStr = format(fechaObj, "EEEE d 'de' MMMM 'a las'", { locale: es });
      const mensaje = `📅 *Cita Asignada*\n\n` +
        `*Prospecto:* ${cita.prospecto.nombre} (${cita.prospecto.telefono})\n` +
        `*Fecha:* ${fechaStr} ${hora}\n` +
        ${cita.propiedad ? `*Propiedad:* ${cita.propiedad.titulo}\n` : ''};

      // TODO: Enviar WA (necesita numeroWhatsappId)
    }

    // Notificación panel
    if (asesorFinal) {
      await crearNotificacion({
        inmobiliariaId,
        usuarioId: asesorFinal,
        tipo: 'CITA_CREADA',
        titulo: 'Nueva cita asignada',
        mensaje: `${cita.prospecto.nombre} - ${format(fechaObj, 'dd/MM/yyyy')} ${hora}`,
        enlace: `/admin/citas`,
      });
    }

    res.status(201).json(cita);
  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

/**
 * PATCH /api/citas/:id
 * Actualizar cita
 */
router.patch('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { inmobiliariaId, id: usuarioId } = req.usuario;
    const { estado, notas, motivoCancelacion } = req.body;

    const cita = await prisma.cita.findFirst({
      where: { id, inmobiliariaId },
      include: { prospecto: true, asesor: true, propiedad: true },
    });

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const updates = {};
    if (notas !== undefined) updates.notas = notas;
    if (motivoCancelacion !== undefined) updates.motivoCancelacion = motivoCancelacion;

    if (estado && estado !== cita.estado) {
      updates.estado = estado;
      
      if (estado === 'CONFIRMADA') {
        updates.confirmadaAt = new Date();
      } else if (estado === 'CANCELADA') {
        updates.canceladaAt = new Date();
      }
    }

    const updated = await prisma.cita.update({
      where: { id },
      data: updates,
      include: { prospecto: true, propiedad: true, asesor: true },
    });

    // Registrar actividad
    await prisma.actividad.create({
      data: {
        inmobiliariaId,
        prospectoId: cita.prospectoId,
        tipo: 'NOTA',
        titulo: `Cita ${estado || 'actualizada'}`,
        descripcion: `${format(cita.fecha, 'dd/MM/yyyy')} ${cita.hora} - ${estado || 'modificada'}`,
        usuarioId,
      },
    });

    // Enviar WhatsApp al cliente si cambió estado
    if (estado && estado !== cita.estado && cita.prospecto.telefono) {
      let mensajeCliente = '';
      
      if (estado === 'CONFIRMADA') {
        const fechaStr = format(cita.fecha, "EEEE d 'de' MMMM 'a las'", { locale: es });
        mensajeCliente = `✅ *Tu cita ha sido confirmada*\n\n` +
          `📅 ${fechaStr} ${cita.hora}\n` +
          ${cita.propiedad ? `🏠 ${cita.propiedad.titulo}\n` : ''} +
          ${cita.asesor ? `👤 Asesor: ${cita.asesor.nombre}\n` : ''} +
          `\n¡Te esperamos!`;
      } else if (estado === 'CANCELADA') {
        mensajeCliente = `❌ *Tu cita ha sido cancelada*\n\n` +
          ${motivoCancelacion ? `Motivo: ${motivoCancelacion}\n\n` : ''} +
          `Para reagendar, escribe *AGENDAR*`;
      }

      if (mensajeCliente) {
        // TODO: Enviar via Baileys (necesita numeroWhatsappId)
        console.log(`TODO: Enviar WA a ${cita.prospecto.telefono}: ${mensajeCliente}`);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Error actualizando cita:', error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

export default router;
