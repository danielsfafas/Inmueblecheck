import { prisma } from '../index.js';
import { obtenerDiasConDisponibilidad, obtenerSlotsDisponibles, validarSlotDisponible, asignarAsesorLibre } from './citas.service.js';
import { crearNotificacion } from './notificaciones.service.js';
import { elegirOpcionConIA } from './iaSeleccion.service.js';
import { interpretarOpcion, interpretarFecha, interpretarHora, interpretarConfirmacion } from '../utils/interpretarRespuesta.js';
import { construirUrlPropiedad, obtenerBaseUrlPublica } from '../utils/publicUrl.js';
import { format } from 'date-fns';
import es from 'date-fns/locale/es/index.js';
import { parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Mexico_City';
const OPCION_CUALQUIERA = {
  etiqueta: 'Cualquier propiedad disponible',
  alias: ['cualquiera', 'cualquier', 'la que sea', 'me da igual', 'todas', 'ninguna en especial', 'no importa'],
};

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

async function guardarEstado(conversacionId, estado) {
  await prisma.conversacion.update({
    where: { id: conversacionId },
    data: { flujoEstado: estado },
  });
}

/**
 * Resuelve la opción elegida: parser primero, IA como respaldo si hay duda.
 * @returns {Promise<{indice?: number, candidatos?: number[], noDisponible?: boolean, fecha?: Date, hora?: string}|null>}
 */
async function resolverOpcion(resultado, mensaje, etiquetas, pregunta) {
  if (resultado && resultado.indice !== undefined) return resultado;
  if (resultado?.noDisponible) return resultado;
  const subconjunto = resultado?.candidatos?.length ? resultado.candidatos : etiquetas.map((_, i) => i);
  const indiceIA = await elegirOpcionConIA(mensaje, subconjunto.map((i) => etiquetas[i]), pregunta);
  if (indiceIA !== null) return { indice: subconjunto[indiceIA], via: 'ia' };
  return resultado;
}

function textoNoEntendi(resultado, etiquetas, total) {
  if (resultado?.candidatos?.length > 1) {
    const opciones = resultado.candidatos.map((i) => `*${i + 1}.* ${etiquetas[i]}`).join('\n');
    return `Tengo varias opciones parecidas 🙂 ¿Cuál de estas?\n\n${opciones}\n\n📝 Responde con el número`;
  }
  if (resultado?.fueraDeRango) {
    return `Solo tengo opciones del 1 al ${total} 🙂`;
  }
  return 'Perdón, no logré entender cuál elegiste 🙏';
}

// ---------- Mensajes de cada paso ----------

function mensajeListaPropiedades(propiedades) {
  let mensaje = '🏠 *¿Qué propiedad te gustaría visitar?*\n\n';
  propiedades.forEach((prop, idx) => {
    mensaje += `*${idx + 1}.* ${prop.titulo}\n`;
    mensaje += `   📍 ${prop.colonia} | 🛏️ ${prop.recamaras} rec | 🚿 ${prop.banos} baños\n`;
    mensaje += `   💰 ${formatPrecio(prop.precio)}\n\n`;
  });
  mensaje += `*${propiedades.length + 1}.* Cualquier propiedad disponible\n\n`;
  mensaje += '📝 Responde con el número o el nombre de la propiedad (por ejemplo: "la 2")\n';
  mensaje += '💡 O escribe *MENU* para cancelar';
  return mensaje;
}

function mensajeListaDias(estado) {
  let respuesta = `📅 *¿Qué día te gustaría agendar la visita?*\n`;
  if (estado.propiedadNombre && estado.propiedadNombre !== OPCION_CUALQUIERA.etiqueta) {
    respuesta += `🏠 Propiedad: ${estado.propiedadNombre}\n`;
  }
  respuesta += '\n*Días disponibles:*\n\n';
  estado.diasDisponibles.forEach((iso, idx) => {
    const fechaStr = format(new Date(iso), "EEEE d 'de' MMMM", { locale: es });
    const slots = estado.diasSlots?.[idx];
    respuesta += `*${idx + 1}.* ${capitalizar(fechaStr)}\n`;
    if (slots) respuesta += `   ${slots} horarios disponibles\n`;
    respuesta += '\n';
  });
  respuesta += '📝 Responde con el número o el día (por ejemplo: "mañana" o "el viernes")\n';
  respuesta += '💡 O escribe *MENU* para cancelar';
  return respuesta;
}

function mensajeListaHoras(estado) {
  const fecha = new Date(estado.fechaSeleccionada);
  let respuesta = `🕐 *¿A qué hora?*\n`;
  respuesta += `📅 ${capitalizar(format(fecha, "EEEE d 'de' MMMM", { locale: es }))}\n\n`;
  respuesta += '*Horarios disponibles:*\n\n';
  estado.horasDisponibles.forEach((hora, idx) => {
    respuesta += `*${idx + 1}.* ${hora}\n`;
  });
  respuesta += '\n📝 Responde con el número o la hora (por ejemplo: "a las 10")\n';
  respuesta += '💡 O escribe *MENU* para cancelar';
  return respuesta;
}

function etiquetasPropiedades(estado) {
  return [
    ...estado.opcionesPropiedades.map((p) => `${p.titulo}${p.colonia ? ` ${p.colonia}` : ''}`),
    OPCION_CUALQUIERA.etiqueta,
  ];
}

function etiquetasDias(estado) {
  return estado.diasDisponibles.map((iso) => capitalizar(format(new Date(iso), "EEEE d 'de' MMMM", { locale: es })));
}

/**
 * Iniciar flujo de booking
 */
export async function iniciarFlujoCita(conversacion, contexto) {
  try {
    // Verificar si hay propiedad de interés
    const interes = await prisma.interes.findFirst({
      where: { prospectoId: conversacion.prospectoId },
      include: { propiedad: true },
      orderBy: { createdAt: 'desc' },
    });

    const estado = {
      paso: 1,
      propiedadId: interes?.propiedadId || null,
      propiedadNombre: interes?.propiedad?.titulo || null,
    };

    await prisma.conversacion.update({
      where: { id: conversacion.id },
      data: {
        flujoBot: 'booking',
        flujoEstado: estado,
      },
    });

    // Si tiene propiedad de interés, ir directo a paso 2 (días)
    if (interes) {
      estado.paso = 2;
      await guardarEstado(conversacion.id, estado);
      return await procesarPaso2SeleccionarDia(conversacion, null, contexto, estado);
    }

    // Si no, listar propiedades disponibles
    const propiedades = await prisma.propiedad.findMany({
      where: {
        inmobiliariaId: contexto.inmobiliaria.id,
        estadoPropiedad: 'DISPONIBLE',
      },
      take: 20,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        titulo: true,
        precio: true,
        colonia: true,
        recamaras: true,
        banos: true,
      },
    });

    if (propiedades.length === 0) {
      await limpiarFlujo(conversacion.id);
      return 'No hay propiedades disponibles en este momento. Por favor escribe *AGENTE* para hablar con un asesor.';
    }

    // Guardar la lista mostrada para que "la 6" siempre sea la misma propiedad
    estado.opcionesPropiedades = propiedades.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      colonia: p.colonia,
      recamaras: p.recamaras,
      banos: p.banos,
      precio: String(p.precio),
    }));
    await guardarEstado(conversacion.id, estado);

    return mensajeListaPropiedades(estado.opcionesPropiedades);
  } catch (error) {
    console.error('Error iniciando flujo cita:', error);
    await limpiarFlujo(conversacion.id);
    return 'Hubo un error al iniciar el proceso. Por favor intenta de nuevo más tarde.';
  }
}

/**
 * Procesar mensaje dentro del flujo
 */
export async function procesarFlujoCita(conversacion, mensaje, contexto) {
  try {
    const estado = conversacion.flujoEstado || {};
    const mensajeNorm = mensaje.trim().toUpperCase();

    // Comandos de salida
    if (mensajeNorm === 'MENU' || mensajeNorm === 'MENÚ' || mensajeNorm === 'CANCELAR' || mensajeNorm === 'SALIR') {
      await limpiarFlujo(conversacion.id);
      return 'Proceso cancelado. ¿En qué más puedo ayudarte?';
    }

    // Redirigir según paso
    switch (estado.paso) {
      case 1:
        return await procesarPaso1SeleccionarPropiedad(conversacion, mensaje, contexto, estado);
      case 2:
        return await procesarPaso2SeleccionarDia(conversacion, mensaje, contexto, estado);
      case 3:
        return await procesarPaso3SeleccionarHora(conversacion, mensaje, contexto, estado);
      case 4:
        return await procesarPaso4Confirmar(conversacion, mensaje, contexto, estado);
      default:
        await limpiarFlujo(conversacion.id);
        return 'Proceso reiniciado. Escribe *AGENDAR* para comenzar de nuevo.';
    }
  } catch (error) {
    console.error('Error procesando flujo cita:', error);
    await limpiarFlujo(conversacion.id);
    return 'Hubo un error. Por favor intenta de nuevo.';
  }
}

/**
 * Paso 1: Seleccionar propiedad ("6", "la 6", "la seis", "la casa amplia"...)
 */
async function procesarPaso1SeleccionarPropiedad(conversacion, mensaje, contexto, estado) {
  // Conversaciones iniciadas antes de guardar la lista: reconstruirla en el mismo orden
  if (!estado.opcionesPropiedades) {
    const propiedades = await prisma.propiedad.findMany({
      where: { inmobiliariaId: contexto.inmobiliaria.id, estadoPropiedad: 'DISPONIBLE' },
      take: 20,
      orderBy: { createdAt: 'asc' },
      select: { id: true, titulo: true, colonia: true, recamaras: true, banos: true, precio: true },
    });
    estado.opcionesPropiedades = propiedades.map((p) => ({ ...p, precio: String(p.precio) }));
  }

  const etiquetas = etiquetasPropiedades(estado);
  const opciones = [
    ...estado.opcionesPropiedades.map((p, i) => ({ etiqueta: etiquetas[i] })),
    OPCION_CUALQUIERA,
  ];
  const resultado = await resolverOpcion(
    interpretarOpcion(mensaje, opciones),
    mensaje,
    etiquetas,
    '¿Qué propiedad te gustaría visitar?'
  );

  if (!resultado || resultado.indice === undefined) {
    await guardarEstado(conversacion.id, estado);
    const aviso = textoNoEntendi(resultado, etiquetas, etiquetas.length);
    if (resultado?.candidatos?.length > 1) return aviso;
    return `${aviso}\n\n${mensajeListaPropiedades(estado.opcionesPropiedades)}`;
  }

  if (resultado.indice === estado.opcionesPropiedades.length) {
    estado.propiedadId = null;
    estado.propiedadNombre = OPCION_CUALQUIERA.etiqueta;
  } else {
    const propSeleccionada = estado.opcionesPropiedades[resultado.indice];
    estado.propiedadId = propSeleccionada.id;
    estado.propiedadNombre = propSeleccionada.titulo;
  }

  estado.paso = 2;
  await guardarEstado(conversacion.id, estado);

  return await procesarPaso2SeleccionarDia(conversacion, null, contexto, estado);
}

/**
 * Paso 2: Seleccionar día ("2", "la 2", "mañana", "el viernes", "el 26")
 */
async function procesarPaso2SeleccionarDia(conversacion, mensaje, contexto, estado) {
  // Si es primera vez (mensaje null), mostrar días
  if (!mensaje) {
    const dias = await obtenerDiasConDisponibilidad(contexto.inmobiliaria.id, 10);

    if (dias.length === 0) {
      await limpiarFlujo(conversacion.id);
      return 'No hay disponibilidad en los próximos días. Por favor escribe *AGENTE* para hablar con un asesor.';
    }

    estado.diasDisponibles = dias.map((d) => d.fecha.toISOString());
    estado.diasSlots = dias.map((d) => d.slotsDisponibles);
    await guardarEstado(conversacion.id, estado);

    return mensajeListaDias(estado);
  }

  if (!estado.diasDisponibles?.length) {
    return await procesarPaso2SeleccionarDia(conversacion, null, contexto, estado);
  }

  const fechas = estado.diasDisponibles.map((iso) => new Date(iso));
  const hoy = utcToZonedTime(new Date(), TIMEZONE);
  const etiquetas = etiquetasDias(estado);
  const resultado = await resolverOpcion(
    interpretarFecha(mensaje, fechas, hoy),
    mensaje,
    etiquetas,
    '¿Qué día te gustaría agendar la visita?'
  );

  if (!resultado || resultado.indice === undefined) {
    if (resultado?.noDisponible) {
      const cual = resultado.fecha
        ? capitalizar(format(resultado.fecha, "EEEE d 'de' MMMM", { locale: es }))
        : 'Ese día';
      return `${cual} no tengo horarios disponibles 🙏 Elige uno de estos días:\n\n${mensajeListaDias(estado)}`;
    }
    const aviso = textoNoEntendi(resultado, etiquetas, etiquetas.length);
    if (resultado?.candidatos?.length > 1) return aviso;
    return `${aviso}\n\n${mensajeListaDias(estado)}`;
  }

  estado.fechaSeleccionada = estado.diasDisponibles[resultado.indice];
  estado.paso = 3;
  await guardarEstado(conversacion.id, estado);

  return await procesarPaso3SeleccionarHora(conversacion, null, contexto, estado);
}

/**
 * Paso 3: Seleccionar hora ("3", "la 3", "a las 10", "4 pm")
 */
async function procesarPaso3SeleccionarHora(conversacion, mensaje, contexto, estado) {
  const fecha = parseISO(estado.fechaSeleccionada);

  // Si es primera vez, mostrar horas
  if (!mensaje) {
    const { slots } = await obtenerSlotsDisponibles(
      contexto.inmobiliaria.id,
      fecha,
      estado.propiedadId
    );

    const slotsDisponibles = slots.filter((s) => s.disponible);

    if (slotsDisponibles.length === 0) {
      // Volver a paso 2
      estado.paso = 2;
      await guardarEstado(conversacion.id, estado);
      return `Lo siento, ya no hay horarios disponibles para ese día. Elige otro día:\n\n${mensajeListaDias(estado)}`;
    }

    estado.horasDisponibles = slotsDisponibles.map((s) => s.hora);
    await guardarEstado(conversacion.id, estado);

    return mensajeListaHoras(estado);
  }

  if (!estado.horasDisponibles?.length) {
    return await procesarPaso3SeleccionarHora(conversacion, null, contexto, estado);
  }

  const etiquetas = estado.horasDisponibles;
  const resultado = await resolverOpcion(
    interpretarHora(mensaje, estado.horasDisponibles),
    mensaje,
    etiquetas,
    '¿A qué hora?'
  );

  if (!resultado || resultado.indice === undefined) {
    if (resultado?.noDisponible) {
      return `A las ${resultado.hora} no tengo lugar ese día 🙏 Elige uno de estos horarios:\n\n${mensajeListaHoras(estado)}`;
    }
    const aviso = textoNoEntendi(resultado, etiquetas, etiquetas.length);
    if (resultado?.candidatos?.length > 1) return aviso;
    return `${aviso}\n\n${mensajeListaHoras(estado)}`;
  }

  estado.horaSeleccionada = estado.horasDisponibles[resultado.indice];
  estado.paso = 4;
  await guardarEstado(conversacion.id, estado);

  return await procesarPaso4Confirmar(conversacion, null, contexto, estado);
}

function linkPropiedad(estado, contexto) {
  if (!estado.propiedadId) return null;
  return construirUrlPropiedad(estado.propiedadId, contexto.inmobiliaria);
}

/**
 * Paso 4: Confirmar ("1", "sí", "confirmo" / "0", "no")
 */
async function procesarPaso4Confirmar(conversacion, mensaje, contexto, estado) {
  const fecha = parseISO(estado.fechaSeleccionada);

  const resumen = () => {
    const dia = capitalizar(format(fecha, "EEEE d 'de' MMMM", { locale: es }));
    let respuesta = '✅ *Resumen de tu cita*\n\n';
    if (estado.propiedadNombre && estado.propiedadNombre !== OPCION_CUALQUIERA.etiqueta) {
      respuesta += `🏠 *Propiedad:* ${estado.propiedadNombre}\n`;
      const link = linkPropiedad(estado, contexto);
      if (link) respuesta += `🔗 ${link}\n`;
    }
    respuesta += `📅 *Fecha:* ${dia} a las ${estado.horaSeleccionada}\n\n`;
    respuesta += '*¿Confirmas la cita?*\n\n';
    respuesta += '✅ Responde *1* o *sí* para confirmar\n';
    respuesta += '❌ Responde *0* o *no* para cancelar';
    return respuesta;
  };

  // Si es primera vez, mostrar resumen
  if (!mensaje) return resumen();

  const confirmacion = interpretarConfirmacion(mensaje);
  if (confirmacion === true) {
    return await crearCita(conversacion, contexto, estado);
  }
  if (confirmacion === false) {
    await limpiarFlujo(conversacion.id);
    return 'Cita cancelada. ¿En qué más puedo ayudarte?';
  }
  return `Perdón, no te entendí 🙏 ¿Confirmas la cita? Responde *sí* o *no*.\n\n${resumen()}`;
}

/**
 * Crear cita en BD
 */
async function crearCita(conversacion, contexto, estado) {
  try {
    const fecha = parseISO(estado.fechaSeleccionada);
    const hora = estado.horaSeleccionada;

    // Validar disponibilidad nuevamente
    const validacion = await validarSlotDisponible(
      contexto.inmobiliaria.id,
      fecha,
      hora,
      estado.propiedadId
    );

    if (!validacion.valido) {
      await limpiarFlujo(conversacion.id);
      return `Lo siento, ese horario ya no está disponible: ${validacion.error}. Por favor intenta agendar de nuevo.`;
    }

    // Asignar asesor libre
    const prospecto = await prisma.prospecto.findUnique({
      where: { id: conversacion.prospectoId },
      include: { ejecutivo: true, inmobiliaria: true },
    });

    let asesorId = prospecto.ejecutivoId;
    if (!asesorId) {
      const asesorLibre = await asignarAsesorLibre(contexto.inmobiliaria.id, fecha, hora);
      asesorId = asesorLibre?.id || null;
    }

    // Crear cita
    const inmobiliaria = await prisma.inmobiliaria.findUnique({
      where: { id: contexto.inmobiliaria.id },
      select: { duracionCitaMin: true },
    });

    const cita = await prisma.cita.create({
      data: {
        inmobiliariaId: contexto.inmobiliaria.id,
        prospectoId: conversacion.prospectoId,
        propiedadId: estado.propiedadId,
        asesorId,
        fecha,
        hora,
        duracionMin: inmobiliaria.duracionCitaMin || 60,
        estado: 'PENDIENTE',
        origen: 'WHATSAPP',
      },
      include: {
        asesor: true,
        propiedad: true,
      },
    });

    // Crear actividad VISITA
    await prisma.actividad.create({
      data: {
        inmobiliariaId: contexto.inmobiliaria.id,
        prospectoId: conversacion.prospectoId,
        tipo: 'VISITA',
        titulo: 'Visita agendada por WhatsApp',
        descripcion: `Cita ${format(fecha, 'dd/MM/yyyy')} a las ${hora}${
          cita.propiedad ? ` - ${cita.propiedad.titulo}` : ''
        }`,
        usuarioId: asesorId,
      },
    });

    // Mover prospecto a etapa VISITA si está antes
    if (['NUEVO', 'CONTACTADO'].includes(prospecto.etapa)) {
      await prisma.prospecto.update({
        where: { id: prospecto.id },
        data: { etapa: 'VISITA' },
      });
    }

    // Notificar asesor
    if (cita.asesor) {
      const fechaStr = format(fecha, "EEEE d 'de' MMMM 'a las'", { locale: es });
      const mensajeAsesor = `📅 *Nueva Cita Agendada*\n\n` +
        `*Prospecto:* ${prospecto.nombre} (${prospecto.telefono})\n` +
        `*Fecha:* ${fechaStr} ${hora}\n` +
        `${cita.propiedad ? `*Propiedad:* ${cita.propiedad.titulo}\n` : ''}` +
        `\n🔗 Ver en panel: ${obtenerBaseUrlPublica()}/admin/citas`;

      // WhatsApp si tiene teléfono
      if (cita.asesor.telefonoWhatsapp && conversacion.numeroWhatsappId) {
        const { sendBaileysMessage } = await import('./baileys.service.js');
        await sendBaileysMessage(
          conversacion.numeroWhatsappId,
          cita.asesor.telefonoWhatsapp.replace(/\D/g, ''),
          mensajeAsesor
        );
      }

      // Notificación panel
      await crearNotificacion({
        inmobiliariaId: contexto.inmobiliaria.id,
        usuarioId: cita.asesorId,
        tipo: 'CITA_CREADA',
        titulo: 'Nueva cita agendada',
        mensaje: `${prospecto.nombre} agendó una visita para ${format(fecha, 'dd/MM/yyyy')} a las ${hora}`,
        enlace: `/admin/citas`,
      });
    }

    // Limpiar flujo
    await limpiarFlujo(conversacion.id);

    // Respuesta al cliente
    const fechaStr = format(fecha, "EEEE d 'de' MMMM", { locale: es });
    let respuesta = `✅ *¡Cita agendada!*\n\n`;
    respuesta += `📅 ${fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)}\n`;
    respuesta += `🕐 ${hora}\n`;
    if (cita.propiedad) {
      respuesta += `🏠 ${cita.propiedad.titulo}\n`;
      respuesta += `🔗 ${construirUrlPropiedad(cita.propiedad.id, contexto.inmobiliaria)}\n`;
    }
    if (cita.asesor) {
      respuesta += `👤 Asesor: ${cita.asesor.nombre}\n`;
    }
    respuesta += `\n¡Te esperamos! Recibirás un recordatorio antes de la cita.\n\n`;
    respuesta += `💡 Para cancelar o reagendar, escribe *CITA*`;

    return respuesta;

  } catch (error) {
    console.error('Error creando cita:', error);
    await limpiarFlujo(conversacion.id);
    return 'Hubo un error al confirmar tu cita. Por favor intenta de nuevo o escribe *AGENTE*.';
  }
}

/**
 * Limpiar flujo
 */
async function limpiarFlujo(conversacionId) {
  await prisma.conversacion.update({
    where: { id: conversacionId },
    data: {
      flujoBot: null,
      flujoEstado: null,
    },
  });
}

/**
 * Gestionar citas existentes (cancelar/reagendar)
 */
export async function gestionarCitaExistente(conversacion, mensaje, contexto) {
  const prospecto = await prisma.prospecto.findUnique({
    where: { id: conversacion.prospectoId },
  });

  // Buscar citas activas del prospecto
  const citasActivas = await prisma.cita.findMany({
    where: {
      prospectoId: prospecto.id,
      estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
      fecha: { gte: new Date() },
    },
    orderBy: { fecha: 'asc' },
    include: { propiedad: true },
  });

  if (citasActivas.length === 0) {
    return 'No tienes citas programadas. ¿Te gustaría agendar una? Escribe *AGENDAR*.';
  }

  const cita = citasActivas[0];
  const fechaStr = format(cita.fecha, "EEEE d 'de' MMMM 'a las'", { locale: es });

  let respuesta = `📅 *Tu próxima cita:*\n\n`;
  respuesta += `${fechaStr} ${cita.hora}\n`;
  if (cita.propiedad) {
    respuesta += `🏠 ${cita.propiedad.titulo}\n`;
  }
  respuesta += `\n*¿Qué deseas hacer?*\n\n`;
  respuesta += `*1.* Cancelar esta cita\n`;
  respuesta += `*2.* Reagendar para otro día\n`;
  respuesta += `*0.* No hacer nada\n\n`;
  respuesta += `📝 Responde con el número de tu elección`;

  return respuesta;
}

function formatPrecio(precio) {
  return `$${parseFloat(precio).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
}
