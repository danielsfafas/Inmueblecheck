import { prisma } from '../index.js';
import { startOfDay, addDays, format, parse, isAfter, isBefore, addMinutes, parseISO } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Mexico_City';

/**
 * Obtener slots disponibles para una fecha
 */
export async function obtenerSlotsDisponibles(inmobiliariaId, fecha, propiedadId = null) {
  try {
    const fechaLocal = typeof fecha === 'string' ? parseISO(fecha) : fecha;
    const diaSemana = fechaLocal.getDay() === 0 ? 7 : fechaLocal.getDay(); // ISO: 1=Mon, 7=Sun

    // 1. Obtener horario para ese día
    const horario = await prisma.horarioCitas.findUnique({
      where: {
        inmobiliariaId_diaSemana: {
          inmobiliariaId,
          diaSemana,
        },
      },
    });

    if (!horario || !horario.activo) {
      return { slots: [], motivo: 'Día no laborable' };
    }

    // 2. Obtener configuración inmobiliaria
    const inmobiliaria = await prisma.inmobiliaria.findUnique({
      where: { id: inmobiliariaId },
      select: {
        duracionCitaMin: true,
        tiempoAntelacionMin: true,
      },
    });

    const duracion = inmobiliaria.duracionCitaMin || 60;
    const leadTime = inmobiliaria.tiempoAntelacionMin || 120;

    // 3. Verificar cierres de calendario
    const cierres = await prisma.cierreCalendario.findMany({
      where: {
        inmobiliariaId,
        fecha: {
          gte: startOfDay(fechaLocal),
          lt: addDays(startOfDay(fechaLocal), 1),
        },
      },
    });

    const cierreDiaCompleto = cierres.find(c => c.diaCompleto);
    if (cierreDiaCompleto) {
      return { slots: [], motivo: `Cerrado: ${cierreDiaCompleto.motivo}` };
    }

    // 4. Generar grid de slots
    const slots = [];
    const horaInicio = parse(horario.horaInicio, 'HH:mm', fechaLocal);
    const horaFin = parse(horario.horaFin, 'HH:mm', fechaLocal);
    
    let slotActual = horaInicio;
    
    while (isBefore(slotActual, horaFin)) {
      const slotFin = addMinutes(slotActual, duracion);
      
      if (isAfter(slotFin, horaFin)) {
        break; // Slot no cabe completo antes del cierre
      }

      const horaStr = format(slotActual, 'HH:mm');

      // Skip lunch break si está definido
      if (horario.pausaInicio && horario.pausaFin) {
        const pausaInicio = parse(horario.pausaInicio, 'HH:mm', fechaLocal);
        const pausaFin = parse(horario.pausaFin, 'HH:mm', fechaLocal);
        
        const overlapLunch = 
          (isBefore(slotActual, pausaFin) && isAfter(slotFin, pausaInicio));
        
        if (overlapLunch) {
          slotActual = addMinutes(slotActual, duracion);
          continue;
        }
      }

      // Skip si overlap con cierre parcial
      const overlapCierre = cierres.some(c => {
        if (c.diaCompleto) return false;
        const cierreInicio = parse(c.horaInicio, 'HH:mm', fechaLocal);
        const cierreFin = parse(c.horaFin, 'HH:mm', fechaLocal);
        return isBefore(slotActual, cierreFin) && isAfter(slotFin, cierreInicio);
      });

      if (!overlapCierre) {
        slots.push({
          hora: horaStr,
          fecha: fechaLocal,
          duracionMin: duracion,
        });
      }

      slotActual = addMinutes(slotActual, duracion);
    }

    // 5. Si es hoy, filtrar slots pasados + lead time
    const ahoraLocal = utcToZonedTime(new Date(), TIMEZONE);
    const esHoy = format(fechaLocal, 'yyyy-MM-dd') === format(ahoraLocal, 'yyyy-MM-dd');

    if (esHoy) {
      const minimoHora = addMinutes(ahoraLocal, leadTime);
      slots.forEach(slot => {
        const slotDateTime = parse(slot.hora, 'HH:mm', fechaLocal);
        slot.disponible = isAfter(slotDateTime, minimoHora);
      });
    }

    // 6. Calcular capacidad (citas activas en ese slot)
    for (const slot of slots) {
      const capacidad = await calcularCapacidadSlot(
        inmobiliariaId,
        fechaLocal,
        slot.hora,
        duracion,
        propiedadId
      );
      slot.capacidad = capacidad.disponible;
      slot.asesoresLibres = capacidad.asesoresLibres;
      slot.disponible = slot.disponible !== false && capacidad.disponible > 0;
    }

    return { slots, horario };

  } catch (error) {
    console.error('Error obteniendo slots:', error);
    throw error;
  }
}

/**
 * Calcular capacidad de un slot específico
 */
async function calcularCapacidadSlot(inmobiliariaId, fecha, hora, duracionMin, propiedadId) {
  // Obtener citas activas (PENDIENTE o CONFIRMADA) en ese slot
  const citasEnSlot = await prisma.cita.findMany({
    where: {
      inmobiliariaId,
      fecha: {
        gte: startOfDay(fecha),
        lt: addDays(startOfDay(fecha), 1),
      },
      hora,
      estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
    },
    include: {
      asesor: true,
      propiedad: true,
    },
  });

  // Obtener asesores activos de la inmobiliaria
  const asesores = await prisma.usuario.findMany({
    where: {
      inmobiliariaId,
      activo: true,
      rol: { in: ['EJECUTIVO', 'SUPERVISOR', 'ADMIN'] },
    },
    select: { id: true },
  });

  const totalAsesores = asesores.length;
  const asesoresOcupados = new Set(citasEnSlot.map(c => c.asesorId).filter(Boolean));
  const asesoresLibres = totalAsesores - asesoresOcupados.size;

  // Si se especifica propiedad, verificar si está ocupada
  if (propiedadId) {
    const propiedadOcupada = citasEnSlot.some(c => c.propiedadId === propiedadId);
    if (propiedadOcupada) {
      return { disponible: 0, asesoresLibres: 0 };
    }
  }

  return {
    disponible: asesoresLibres,
    asesoresLibres,
  };
}

/**
 * Validar disponibilidad de slot antes de crear cita
 */
export async function validarSlotDisponible(
  inmobiliariaId,
  fecha,
  hora,
  propiedadId = null,
  asesorId = null
) {
  try {
    const fechaLocal = typeof fecha === 'string' ? parseISO(fecha) : fecha;
    
    // 1. Verificar que no sea pasado
    const ahoraLocal = utcToZonedTime(new Date(), TIMEZONE);
    const slotDateTime = parse(hora, 'HH:mm', fechaLocal);
    
    if (isBefore(slotDateTime, ahoraLocal)) {
      return { valido: false, error: 'El horario seleccionado ya pasó' };
    }

    // 2. Verificar horario abierto
    const diaSemana = fechaLocal.getDay() === 0 ? 7 : fechaLocal.getDay();
    const horario = await prisma.horarioCitas.findUnique({
      where: {
        inmobiliariaId_diaSemana: {
          inmobiliariaId,
          diaSemana,
        },
      },
    });

    if (!horario || !horario.activo) {
      return { valido: false, error: 'Día no laborable' };
    }

    // 3. Verificar que hora esté en rango
    const horaInicio = parse(horario.horaInicio, 'HH:mm', fechaLocal);
    const horaFin = parse(horario.horaFin, 'HH:mm', fechaLocal);
    
    if (isBefore(slotDateTime, horaInicio) || isAfter(slotDateTime, horaFin)) {
      return { valido: false, error: 'Horario fuera de atención' };
    }

    // 4. Verificar cierres
    const cierres = await prisma.cierreCalendario.findMany({
      where: {
        inmobiliariaId,
        fecha: {
          gte: startOfDay(fechaLocal),
          lt: addDays(startOfDay(fechaLocal), 1),
        },
      },
    });

    if (cierres.some(c => c.diaCompleto)) {
      return { valido: false, error: 'Día cerrado' };
    }

    const inmobiliaria = await prisma.inmobiliaria.findUnique({
      where: { id: inmobiliariaId },
      select: { duracionCitaMin: true, tiempoAntelacionMin: true },
    });

    const duracion = inmobiliaria.duracionCitaMin || 60;
    const slotFin = addMinutes(slotDateTime, duracion);

    const overlapCierre = cierres.some(c => {
      if (c.diaCompleto) return false;
      const cierreInicio = parse(c.horaInicio, 'HH:mm', fechaLocal);
      const cierreFin = parse(c.horaFin, 'HH:mm', fechaLocal);
      return isBefore(slotDateTime, cierreFin) && isAfter(slotFin, cierreInicio);
    });

    if (overlapCierre) {
      return { valido: false, error: 'Horario cerrado' };
    }

    // 5. Verificar lead time si es hoy
    const esHoy = format(fechaLocal, 'yyyy-MM-dd') === format(ahoraLocal, 'yyyy-MM-dd');
    if (esHoy) {
      const leadTime = inmobiliaria.tiempoAntelacionMin || 120;
      const minimoHora = addMinutes(ahoraLocal, leadTime);
      if (isBefore(slotDateTime, minimoHora)) {
        return {
          valido: false,
          error: `Debe agendar con al menos ${leadTime} minutos de anticipación`,
        };
      }
    }

    // 6. Verificar capacidad
    if (asesorId) {
      // Verificar que asesor esté libre
      const citaAsesor = await prisma.cita.findFirst({
        where: {
          inmobiliariaId,
          fecha: {
            gte: startOfDay(fechaLocal),
            lt: addDays(startOfDay(fechaLocal), 1),
          },
          hora,
          asesorId,
          estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        },
      });

      if (citaAsesor) {
        return { valido: false, error: 'El asesor no está disponible en ese horario' };
      }
    }

    if (propiedadId) {
      // Verificar que propiedad esté libre
      const citaPropiedad = await prisma.cita.findFirst({
        where: {
          inmobiliariaId,
          fecha: {
            gte: startOfDay(fechaLocal),
            lt: addDays(startOfDay(fechaLocal), 1),
          },
          hora,
          propiedadId,
          estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        },
      });

      if (citaPropiedad) {
        return { valido: false, error: 'La propiedad no está disponible en ese horario' };
      }
    }

    return { valido: true };

  } catch (error) {
    console.error('Error validando slot:', error);
    return { valido: false, error: 'Error al validar disponibilidad' };
  }
}

/**
 * Obtener próximos días con disponibilidad
 */
export async function obtenerDiasConDisponibilidad(inmobiliariaId, limite = 10) {
  const diasConSlots = [];
  const ahoraLocal = utcToZonedTime(new Date(), TIMEZONE);
  const inmobiliaria = await prisma.inmobiliaria.findUnique({
    where: { id: inmobiliariaId },
    select: { diasConCitasAdelante: true },
  });

  const maxDias = inmobiliaria.diasConCitasAdelante || 45;
  
  for (let i = 0; i < maxDias && diasConSlots.length < limite; i++) {
    const fecha = addDays(startOfDay(ahoraLocal), i);
    const { slots } = await obtenerSlotsDisponibles(inmobiliariaId, fecha);
    
    const slotsDisponibles = slots.filter(s => s.disponible);
    
    if (slotsDisponibles.length > 0) {
      diasConSlots.push({
        fecha,
        slotsDisponibles: slotsDisponibles.length,
      });
    }
  }

  return diasConSlots;
}

/**
 * Asignar asesor libre automáticamente
 */
export async function asignarAsesorLibre(inmobiliariaId, fecha, hora) {
  const asesores = await prisma.usuario.findMany({
    where: {
      inmobiliariaId,
      activo: true,
      rol: { in: ['EJECUTIVO', 'SUPERVISOR', 'ADMIN'] },
    },
    select: { id: true, nombre: true },
  });

  // Verificar cuál está libre
  for (const asesor of asesores) {
    const citaExistente = await prisma.cita.findFirst({
      where: {
        inmobiliariaId,
        fecha: {
          gte: startOfDay(fecha),
          lt: addDays(startOfDay(fecha), 1),
        },
        hora,
        asesorId: asesor.id,
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
      },
    });

    if (!citaExistente) {
      return asesor;
    }
  }

  return null;
}
