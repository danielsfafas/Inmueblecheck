/**
 * Cálculos puros de la vista "Día" de Citas (sin React ni red), para poder probarlos.
 * Las horas son cadenas "HH:mm" y las fechas "yyyy-MM-dd" en hora local de la inmobiliaria.
 */

export const SIN_ASESOR = 'sin-asesor';

export function aMinutos(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
}

export function aHora(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 1 = lunes … 7 = domingo, igual que HorarioCitas.diaSemana */
export function diaSemanaISO(fecha) {
  const d = fecha.getDay();
  return d === 0 ? 7 : d;
}

/** Fecha "yyyy-MM-dd" de una cita o cierre, sin recorrerla por zona horaria. */
export function fechaClave(valor) {
  return String(valor).slice(0, 10);
}

function traslapa(inicioA, finA, inicioB, finB) {
  return inicioA < finB && inicioB < finA;
}

/**
 * Filas de la agenda de un día según Horarios, duración y cierres.
 * Devuelve { cerrado, motivo, filas } donde cada fila es
 *   { tipo: 'slot', hora, fin } | { tipo: 'pausa', hora, fin } | { tipo: 'cierre', hora, fin, motivo }
 */
export function filasDelDia({ horario, duracionMin = 60, cierres = [] }) {
  if (!horario || !horario.activo) {
    return { cerrado: true, motivo: 'Día no laborable', filas: [] };
  }
  const completo = cierres.find((c) => c.diaCompleto);
  if (completo) {
    return { cerrado: true, motivo: completo.motivo || 'Cerrado', filas: [] };
  }

  const duracion = Number(duracionMin) > 0 ? Number(duracionMin) : 60;
  const inicio = aMinutos(horario.horaInicio);
  const fin = aMinutos(horario.horaFin);
  const pausa = horario.pausaInicio && horario.pausaFin
    ? { inicio: aMinutos(horario.pausaInicio), fin: aMinutos(horario.pausaFin) }
    : null;
  const parciales = cierres
    .filter((c) => !c.diaCompleto && c.horaInicio && c.horaFin)
    .map((c) => ({ inicio: aMinutos(c.horaInicio), fin: aMinutos(c.horaFin), motivo: c.motivo || 'Cerrado' }));

  const filas = [];
  let pausaMostrada = false;
  for (let t = inicio; t + duracion <= fin; t += duracion) {
    const tFin = t + duracion;
    if (pausa && traslapa(t, tFin, pausa.inicio, pausa.fin)) {
      if (!pausaMostrada) {
        filas.push({ tipo: 'pausa', hora: horario.pausaInicio, fin: horario.pausaFin });
        pausaMostrada = true;
      }
      continue;
    }
    const cierre = parciales.find((c) => traslapa(t, tFin, c.inicio, c.fin));
    if (cierre) {
      filas.push({ tipo: 'cierre', hora: aHora(t), fin: aHora(tFin), motivo: cierre.motivo });
      continue;
    }
    filas.push({ tipo: 'slot', hora: aHora(t), fin: aHora(tFin) });
  }
  return { cerrado: false, motivo: '', filas };
}

/**
 * Agrega filas para citas cuya hora no coincide con ningún slot (p. ej. 10:30 o fuera de horario),
 * para que ninguna cita quede escondida. Devuelve las filas ordenadas por hora.
 */
export function integrarHorasDeCitas(filas, citas) {
  // Solo las filas 'slot' alojan citas; si una cita cae en comida o en un cierre, también se muestra.
  const horas = new Set(filas.filter((f) => f.tipo === 'slot').map((f) => f.hora));
  const extra = [];
  for (const cita of citas) {
    if (!horas.has(cita.hora)) {
      horas.add(cita.hora);
      extra.push({ tipo: 'extra', hora: cita.hora, fin: aHora(aMinutos(cita.hora) + (cita.duracionMin || 60)) });
    }
  }
  if (extra.length === 0) return filas;
  return [...filas, ...extra].sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora));
}

/** Columnas = asesores; se agrega "Sin asignar" si alguna cita no tiene asesor conocido. */
export function columnasDeAgenda(asesores, citas) {
  const columnas = asesores.map((a) => ({ id: a.id, nombre: a.nombre }));
  if (citas.some((c) => columnaDeCita(c, asesores) === SIN_ASESOR)) {
    columnas.push({ id: SIN_ASESOR, nombre: 'Sin asignar' });
  }
  return columnas;
}

export function columnaDeCita(cita, asesores) {
  const id = cita.asesorId || cita.asesor?.id;
  return id && asesores.some((a) => a.id === id) ? id : SIN_ASESOR;
}

/** Citas visibles en la agenda: sin canceladas salvo que se pidan. */
export function citasVisibles(citas, { incluirCanceladas = false } = {}) {
  return citas.filter((c) => incluirCanceladas || c.estado !== 'CANCELADA');
}

/** Conteo de citas por fecha "yyyy-MM-dd" (sin canceladas). */
export function conteoPorDia(citas) {
  const conteo = {};
  for (const c of citas) {
    if (c.estado === 'CANCELADA') continue;
    const k = fechaClave(c.fecha);
    conteo[k] = (conteo[k] || 0) + 1;
  }
  return conteo;
}

/** ¿Ya pasó el inicio de este horario? (para no ofrecer "Agendar" en el pasado) */
export function yaPaso(fechaISO, hora, ahora = new Date()) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi) <= ahora;
}

/** Enlace de WhatsApp a partir de un teléfono (agrega 52 a números de 10 dígitos). */
export function enlaceWhatsApp(telefono) {
  let digitos = String(telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 10) digitos = `52${digitos}`;
  return `https://wa.me/${digitos}`;
}
