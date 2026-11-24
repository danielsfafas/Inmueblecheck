import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';
import { validarSlotDisponible, asignarAsesorLibre, obtenerSlotsDisponibles } from '../services/citas.service.js';
import { crearNotificacion } from '../services/notificaciones.service.js';
import { enviarMensajeCitaAlProspecto } from '../services/citasWhatsapp.service.js';
import { normalizarNumeroE164 } from '../utils/whatsapp-multiusuario.js';
import { addDays, format, parseISO, isValid } from 'date-fns';

const router = express.Router();

const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'];
const ROLES_ASESOR = ['EJECUTIVO', 'SUPERVISOR', 'ADMIN'];
const INCLUDE_CITA = {
  prospecto: { select: { id: true, nombre: true, telefono: true, noContactar: true } },
  propiedad: { select: { id: true, titulo: true, colonia: true } },
  asesor: { select: { id: true, nombre: true, telefonoWhatsapp: true } },
};

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsearFecha(fecha) {
  if (typeof fecha !== 'string' || !FECHA_RE.test(fecha)) return null;
  const d = parseISO(fecha);
  return isValid(d) ? d : null;
}

/**
 * La hora debe ser uno de los horarios del día según Horarios, Cierres y duración
 * (misma grilla que GET /api/horarios/slots y el bot de WhatsApp).
 */
async function validarHoraEnGrilla(inmobiliariaId, fechaObj, hora, propiedadId) {
  const { slots, motivo } = await obtenerSlotsDisponibles(inmobiliariaId, fechaObj, propiedadId || null);
  if (!slots.length) return motivo || 'No hay horarios ese día';
  const slot = slots.find((s) => s.hora === hora);
  if (!slot) return 'Esa hora no es un horario válido para citas';
  return null;
}

async function validarRelaciones(inmobiliariaId, { prospectoId, propiedadId, asesorId }) {
  if (prospectoId) {
    const p = await prisma.prospecto.findFirst({ where: { id: prospectoId, inmobiliariaId }, select: { id: true } });
    if (!p) return 'Prospecto no válido';
  }
  if (propiedadId) {
    const p = await prisma.propiedad.findFirst({ where: { id: propiedadId, inmobiliariaId }, select: { id: true } });
    if (!p) return 'Propiedad no válida';
  }
  if (asesorId) {
    const u = await prisma.usuario.findFirst({
      where: { id: asesorId, inmobiliariaId, activo: true, rol: { in: ROLES_ASESOR } },
      select: { id: true },
    });
    if (!u) return 'Asesor no válido';
  }
  return null;
}

/**
 * Busca un prospecto por teléfono (últimos 10 dígitos) o lo crea con nombre y teléfono.
 */
async function obtenerOCrearProspecto(req, { nombre, telefono }) {
  const { inmobiliariaId, id: usuarioId, nombre: nombreUsuario, rol } = req.user;
  const digitos = String(telefono || '').replace(/\D/g, '');
  if (!nombre?.trim() || digitos.length < 10) {
    return { error: 'Escribe el nombre y un teléfono de 10 dígitos' };
  }
  const ultimos10 = digitos.slice(-10);
  const existente = await prisma.prospecto.findFirst({
    where: { inmobiliariaId, telefono: { endsWith: ultimos10 } },
  });
  if (existente) return { prospecto: existente, existente: true };

  const prospecto = await prisma.prospecto.create({
    data: {
      inmobiliariaId,
      nombre: nombre.trim(),
      telefono: normalizarNumeroE164(digitos) || digitos,
      origen: 'Manual - Cita desde panel',
      etapa: 'NUEVO',
      ejecutivoId: rol === 'EJECUTIVO' ? usuarioId : null,
    },
  });
  await prisma.consentimiento.create({
    data: {
      inmobiliariaId,
      prospectoId: prospecto.id,
      titular: prospecto.nombre,
      tipo: 'AVISO_PRIVACIDAD',
      accion: 'OTORGA',
      versionDocumento: '1.0',
      textoHash: 'manual_admin',
      canal: 'panel_admin',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  });
  await prisma.actividad.create({
    data: {
      inmobiliariaId,
      prospectoId: prospecto.id,
      usuarioId,
      tipo: 'NOTA',
      titulo: 'Prospecto creado desde Citas',
      descripcion: `Creado por ${nombreUsuario} al agendar una cita`,
    },
  });
  return { prospecto, existente: false };
}

/**
 * GET /api/citas
 * Listar citas con filtros
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { inmobiliariaId } = req.user;
    const { estado, asesorId, propiedadId, origen, fechaInicio, fechaFin } = req.query;

    const where = { inmobiliariaId };
    if (estado) where.estado = estado;
    if (asesorId) where.asesorId = asesorId;
    if (propiedadId) where.propiedadId = propiedadId;
    if (origen) where.origen = origen;

    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) where.fecha.gte = parseISO(fechaInicio);
      if (fechaFin) where.fecha.lt = addDays(parseISO(fechaFin), 1);
    }

    const citas = await prisma.cita.findMany({
      where,
      include: INCLUDE_CITA,
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    });

    res.json(citas);
  } catch (error) {
    console.error('Error listando citas:', error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

/**
 * GET /api/citas/asesores
 * Asesores activos que pueden atender citas (cualquier rol autenticado)
 */
router.get('/asesores', authenticateToken, async (req, res) => {
  try {
    const asesores = await prisma.usuario.findMany({
      where: { inmobiliariaId: req.user.inmobiliariaId, activo: true, rol: { in: ROLES_ASESOR } },
      select: { id: true, nombre: true, rol: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(asesores);
  } catch (error) {
    console.error('Error listando asesores:', error);
    res.status(500).json({ error: 'Error al obtener asesores' });
  }
});

/**
 * GET /api/citas/:id
 * Detalle de cita
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const cita = await prisma.cita.findFirst({
      where: { id: req.params.id, inmobiliariaId: req.user.inmobiliariaId },
      include: { prospecto: true, propiedad: true, asesor: { select: { id: true, nombre: true } } },
    });
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(cita);
  } catch (error) {
    console.error('Error obteniendo cita:', error);
    res.status(500).json({ error: 'Error al obtener cita' });
  }
});

/**
 * POST /api/citas
 * Crear cita desde el panel (origen ADMIN)
 * Body: { prospectoId | prospectoNuevo: {nombre, telefono}, propiedadId?, asesorId?, fecha: 'yyyy-MM-dd', hora: 'HH:mm', notas?, notificarCliente? }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { inmobiliariaId, id: usuarioId } = req.user;
    const { prospectoNuevo, fecha, hora, notas, notificarCliente } = req.body;
    let { prospectoId } = req.body;
    const propiedadId = req.body.propiedadId || null;
    const asesorId = req.body.asesorId || null;

    const fechaObj = parsearFecha(fecha);
    if (!fechaObj || !HORA_RE.test(hora || '')) {
      return res.status(400).json({ error: 'Elige una fecha y un horario válidos' });
    }
    if (!prospectoId && !prospectoNuevo) {
      return res.status(400).json({ error: 'Elige un prospecto o crea uno nuevo' });
    }

    const errorRel = await validarRelaciones(inmobiliariaId, { prospectoId, propiedadId, asesorId });
    if (errorRel) return res.status(400).json({ error: errorRel });

    const errorGrilla = await validarHoraEnGrilla(inmobiliariaId, fechaObj, hora, propiedadId);
    if (errorGrilla) return res.status(409).json({ error: errorGrilla });

    const validacion = await validarSlotDisponible(inmobiliariaId, fechaObj, hora, propiedadId, asesorId);
    if (!validacion.valido) return res.status(409).json({ error: validacion.error });

    // Asignar asesor libre si no viene
    let asesorFinal = asesorId;
    if (!asesorFinal) {
      const asesorLibre = await asignarAsesorLibre(inmobiliariaId, fechaObj, hora);
      if (!asesorLibre) {
        return res.status(409).json({ error: 'No hay asesores libres en ese horario' });
      }
      asesorFinal = asesorLibre.id;
    }

    // Prospecto rápido (después de validar el horario, para no crear prospectos huérfanos)
    if (!prospectoId) {
      const r = await obtenerOCrearProspecto(req, prospectoNuevo);
      if (r.error) return res.status(400).json({ error: r.error });
      prospectoId = r.prospecto.id;
    }

    const inmobiliaria = await prisma.inmobiliaria.findUnique({
      where: { id: inmobiliariaId },
      select: { duracionCitaMin: true },
    });

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
        notas: notas?.trim() || null,
        confirmadaAt: new Date(),
      },
      include: INCLUDE_CITA,
    });

    await prisma.actividad.create({
      data: {
        inmobiliariaId,
        prospectoId,
        tipo: 'VISITA',
        titulo: 'Cita creada desde el panel',
        descripcion: `${format(fechaObj, 'dd/MM/yyyy')} a las ${hora}${cita.propiedad ? ` - ${cita.propiedad.titulo}` : ''}`,
        usuarioId,
      },
    });

    const prospecto = await prisma.prospecto.findUnique({ where: { id: prospectoId } });
    if (['NUEVO', 'CONTACTADO'].includes(prospecto.etapa)) {
      await prisma.prospecto.update({ where: { id: prospectoId }, data: { etapa: 'VISITA' } });
    }

    if (asesorFinal && asesorFinal !== usuarioId) {
      await crearNotificacion({
        inmobiliariaId,
        usuarioId: asesorFinal,
        tipo: 'CITA_CREADA',
        titulo: 'Nueva cita asignada',
        mensaje: `${cita.prospecto.nombre} - ${format(fechaObj, 'dd/MM/yyyy')} ${hora}`,
        enlace: `/admin/citas`,
      });
    }

    const whatsapp = notificarCliente === true
      ? await enviarMensajeCitaAlProspecto('CREADA', cita)
      : { enviado: false, motivo: 'No solicitado' };

    res.status(201).json({ ...cita, whatsapp });
  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

/**
 * PATCH /api/citas/:id
 * Editar, reprogramar, cancelar o cambiar estado
 * Body: { estado?, fecha?, hora?, asesorId?, propiedadId?, notas?, motivoCancelacion?, notificarCliente? }
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { inmobiliariaId, id: usuarioId } = req.user;
    const { estado, notas, motivoCancelacion, notificarCliente } = req.body;

    const cita = await prisma.cita.findFirst({
      where: { id, inmobiliariaId },
      include: INCLUDE_CITA,
    });
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

    if (estado !== undefined && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const updates = {};
    if (notas !== undefined) updates.notas = notas?.trim() || null;
    if (motivoCancelacion !== undefined) updates.motivoCancelacion = motivoCancelacion || null;

    // Cambios de horario / asesor / propiedad
    const cambiaFecha = req.body.fecha !== undefined && req.body.fecha !== format(cita.fecha, 'yyyy-MM-dd');
    const cambiaHora = req.body.hora !== undefined && req.body.hora !== cita.hora;
    const cambiaAsesor = req.body.asesorId !== undefined && (req.body.asesorId || null) !== cita.asesorId;
    const cambiaPropiedad = req.body.propiedadId !== undefined && (req.body.propiedadId || null) !== cita.propiedadId;
    const reprograma = cambiaFecha || cambiaHora;

    if (reprograma || cambiaAsesor || cambiaPropiedad) {
      if (!['PENDIENTE', 'CONFIRMADA'].includes(cita.estado) || (estado && !['PENDIENTE', 'CONFIRMADA'].includes(estado))) {
        return res.status(409).json({ error: 'Solo se pueden mover citas pendientes o confirmadas' });
      }
      const fechaObj = cambiaFecha ? parsearFecha(req.body.fecha) : cita.fecha;
      const hora = cambiaHora ? req.body.hora : cita.hora;
      if (!fechaObj || !HORA_RE.test(hora || '')) {
        return res.status(400).json({ error: 'Elige una fecha y un horario válidos' });
      }
      const propiedadId = cambiaPropiedad ? (req.body.propiedadId || null) : cita.propiedadId;
      let asesorId = cambiaAsesor ? (req.body.asesorId || null) : cita.asesorId;

      const errorRel = await validarRelaciones(inmobiliariaId, { propiedadId, asesorId });
      if (errorRel) return res.status(400).json({ error: errorRel });

      if (reprograma) {
        const errorGrilla = await validarHoraEnGrilla(inmobiliariaId, fechaObj, hora, null);
        if (errorGrilla) return res.status(409).json({ error: errorGrilla });
      }

      const validacion = await validarSlotDisponible(inmobiliariaId, fechaObj, hora, propiedadId, asesorId, { excluirCitaId: id });
      if (!validacion.valido) return res.status(409).json({ error: validacion.error });

      if (!asesorId) {
        const libre = await asignarAsesorLibre(inmobiliariaId, fechaObj, hora, { excluirCitaId: id });
        if (!libre) return res.status(409).json({ error: 'No hay asesores libres en ese horario' });
        asesorId = libre.id;
      }

      updates.fecha = fechaObj;
      updates.hora = hora;
      updates.asesorId = asesorId;
      updates.propiedadId = propiedadId;
      if (reprograma) updates.recordatorioEnviadoAt = null;
    }

    if (estado && estado !== cita.estado) {
      updates.estado = estado;
      if (estado === 'CONFIRMADA') updates.confirmadaAt = new Date();
      if (estado === 'CANCELADA') updates.canceladaAt = new Date();
    }

    const updated = await prisma.cita.update({
      where: { id },
      data: updates,
      include: INCLUDE_CITA,
    });

    const cambioEstado = Boolean(estado && estado !== cita.estado);
    const titulo = reprograma
      ? 'Cita reprogramada'
      : cambioEstado
        ? `Cita ${estado.toLowerCase().replace('_', ' ')}`
        : 'Cita actualizada';
    await prisma.actividad.create({
      data: {
        inmobiliariaId,
        prospectoId: cita.prospectoId,
        tipo: 'NOTA',
        titulo,
        descripcion: reprograma
          ? `De ${format(cita.fecha, 'dd/MM/yyyy')} ${cita.hora} a ${format(updated.fecha, 'dd/MM/yyyy')} ${updated.hora}`
          : `${format(updated.fecha, 'dd/MM/yyyy')} ${updated.hora}${cambioEstado ? ` - ${estado}` : ''}`,
        usuarioId,
      },
    });

    let whatsapp = { enviado: false, motivo: 'No solicitado' };
    if (notificarCliente === true) {
      const tipo = estado === 'CANCELADA' && cambioEstado
        ? 'CANCELADA'
        : reprograma
          ? 'REPROGRAMADA'
          : estado === 'CONFIRMADA' && cambioEstado
            ? 'CONFIRMADA'
            : null;
      whatsapp = tipo
        ? await enviarMensajeCitaAlProspecto(tipo, updated, { motivo: motivoCancelacion })
        : { enviado: false, motivo: 'Sin mensaje para este cambio' };
    }

    res.json({ ...updated, whatsapp });
  } catch (error) {
    console.error('Error actualizando cita:', error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

export default router;
