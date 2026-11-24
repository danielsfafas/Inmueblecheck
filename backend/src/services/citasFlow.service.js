import { prisma } from '../index.js';
import { obtenerDiasConDisponibilidad, obtenerSlotsDisponibles, validarSlotDisponible, asignarAsesorLibre } from './citas.service.js';
import { crearNotificacion, notificarAsesorPorWhatsApp } from './notificaciones.service.js';
import { format } from 'date-fns';
import es from 'date-fns/locale/es/index.js';
import { parseISO } from 'date-fns';

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

    let estado = {
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
      return await procesarPaso2SeleccionarDia(conversacion, contexto, estado);
    }

    // Si no, listar propiedades disponibles
    const propiedades = await prisma.propiedad.findMany({
      where: {
        inmobiliariaId: contexto.inmobiliaria.id,
        estadoPropiedad: 'DISPONIBLE',
      },
      take: 20,
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

    let mensaje = '🏠 *¿Qué propiedad te gustaría visitar?*\n\n';
    propiedades.forEach((prop, idx) => {
      mensaje += `*${idx + 1}.* ${prop.titulo}\n`;
      mensaje += `   📍 ${prop.colonia} | 🛏️ ${prop.recamaras} rec | 🚿 ${prop.banos} baños\n`;
      mensaje += `   💰 ${formatPrecio(prop.precio)}\n\n`;
    });
    mensaje += `*${propiedades.length + 1}.* Cualquier propiedad disponible\n\n`;
    mensaje += '📝 Responde con el número de tu elección\n';
    mensaje += '💡 O escribe *MENU* para cancelar';

    return mensaje;

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
    if (mensajeNorm === 'MENU' || mensajeNorm === 'CANCELAR') {
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
 * Paso 1: Seleccionar propiedad
 */
async function procesarPaso1SeleccionarPropiedad(conversacion, mensaje, contexto, estado) {
  const seleccion = parseInt(mensaje.trim());

  if (isNaN(seleccion)) {
    return 'Por favor responde con el número de la propiedad que te interesa.';
  }

  const propiedades = await prisma.propiedad.findMany({
    where: {
      inmobiliariaId: contexto.inmobiliaria.id,
      estadoPropiedad: 'DISPONIBLE',
    },
    take: 20,
  });

  if (seleccion === propiedades.length + 1) {
    // Cualquier propiedad
    estado.propiedadId = null;
    estado.propiedadNombre = 'Cualquier propiedad';
  } else if (seleccion >= 1 && seleccion <= propiedades.length) {
    const propSeleccionada = propiedades[seleccion - 1];
    estado.propiedadId = propSeleccionada.id;
    estado.propiedadNombre = propSeleccionada.titulo;
  } else {
    return `Por favor elige un número entre 1 y ${propiedades.length + 1}.`;
  }

  estado.paso = 2;
  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { flujoEstado: estado },
  });

  return await procesarPaso2SeleccionarDia(conversacion, null, contexto, estado);
}

/**
 * Paso 2: Seleccionar día
 */
async function procesarPaso2SeleccionarDia(conversacion, mensaje, contexto, estado) {
  // Si es primera vez (mensaje null), mostrar días
  if (!mensaje) {
    const dias = await obtenerDiasConDisponibilidad(contexto.inmobiliaria.id, 10);

    if (dias.length === 0) {
      await limpiarFlujo(conversacion.id);
      return 'No hay disponibilidad en los próximos días. Por favor escribe *AGENTE* para hablar con un asesor.';
    }

    let respuesta = `📅 *¿Qué día te gustaría agendar la visita?*\n`;
    if (estado.propiedadNombre) {
      respuesta += `🏠 Propiedad: ${estado.propiedadNombre}\n`;
    }
    respuesta += '\n*Días disponibles:*\n\n';

    dias.forEach((dia, idx) => {
      const fechaStr = format(dia.fecha, "EEEE d 'de' MMMM", { locale: es });
      respuesta += `*${idx + 1}.* ${fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)}\n`;
      respuesta += `   ${dia.slotsDisponibles} horarios disponibles\n\n`;
    });

    respuesta += '📝 Responde con el número del día\n';
    respuesta += '💡 O escribe *MENU* para cancelar';

    // Guardar días en estado
    estado.diasDisponibles = dias.map(d => d.fecha.toISOString());
    await prisma.conversacion.update({
      where: { id: conversacion.id },
      data: { flujoEstado: estado },
    });

    return respuesta;
  }

  // Procesar selección
  const seleccion = parseInt(mensaje.trim());

  if (isNaN(seleccion) || !estado.diasDisponibles) {
    return 'Por favor responde con el número del día que prefieres.';
  }

  if (seleccion < 1 || seleccion > estado.diasDisponibles.length) {
    return `Por favor elige un número entre 1 y ${estado.diasDisponibles.length}.`;
  }

  const fechaSeleccionada = estado.diasDisponibles[seleccion - 1];
  estado.fechaSeleccionada = fechaSeleccionada;
  estado.paso = 3;

  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { flujoEstado: estado },
  });

  return await procesarPaso3SeleccionarHora(conversacion, null, contexto, estado);
}

/**
 * Paso 3: Seleccionar hora
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

    const slotsDisponibles = slots.filter(s => s.disponible);

    if (slotsDisponibles.length === 0) {
      // Volver a paso 2
      estado.paso = 2;
      await prisma.conversacion.update({
        where: { id: conversacion.id },
        data: { flujoEstado: estado },
      });
      return 'Lo siento, ya no hay horarios disponibles para ese día. Por favor elige otro día.';
    }

    let respuesta = `🕐 *¿A qué hora?*\n`;
    respuesta += `📅 ${format(fecha, "EEEE d 'de' MMMM", { locale: es })}\n\n`;
    respuesta += '*Horarios disponibles:*\n\n';

    slotsDisponibles.forEach((slot, idx) => {
      respuesta += `*${idx + 1}.* ${slot.hora}\n`;
    });

    respuesta += '\n📝 Responde con el número del horario\n';
    respuesta += '💡 O escribe *MENU* para cancelar';

    estado.horasDisponibles = slotsDisponibles.map(s => s.hora);
    await prisma.conversacion.update({
      where: { id: conversacion.id },
      data: { flujoEstado: estado },
    });

    return respuesta;
  }

  // Procesar selección
  const seleccion = parseInt(mensaje.trim());

  if (isNaN(seleccion) || !estado.horasDisponibles) {
    return 'Por favor responde con el número del horario que prefieres.';
  }

  if (seleccion < 1 || seleccion > estado.horasDisponibles.length) {
    return `Por favor elige un número entre 1 y ${estado.horasDisponibles.length}.`;
  }

  const horaSeleccionada = estado.horasDisponibles[seleccion - 1];
  estado.horaSeleccionada = horaSeleccionada;
  estado.paso = 4;

  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { flujoEstado: estado },
  });

  return await procesarPaso4Confirmar(conversacion, null, contexto, estado);
}

/**
 * Paso 4: Confirmar
 */
async function procesarPaso4Confirmar(conversacion, mensaje, contexto, estado) {
  const fecha = parseISO(estado.fechaSeleccionada);

  // Si es primera vez, mostrar resumen
  if (!mensaje) {
    const fechaStr = format(fecha, "EEEE d 'de' MMMM 'a las' HH:mm", {
      locale: es,
    }).replace(/:00$/, '');
    const fechaFormateada = `${fechaStr.split(' a las ')[0]} a las ${estado.horaSeleccionada}`;

    let respuesta = '✅ *Resumen de tu cita*\n\n';
    if (estado.propiedadNombre && estado.propiedadNombre !== 'Cualquier propiedad') {
      respuesta += `🏠 *Propiedad:* ${estado.propiedadNombre}\n`;
    }
    respuesta += `📅 *Fecha:* ${fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)}\n\n`;
    respuesta += '*¿Confirmas la cita?*\n\n';
    respuesta += '✅ Responde *1* para confirmar\n';
    respuesta += '❌ Responde *0* para cancelar';

    return respuesta;
  }

  // Procesar confirmación
  const respuesta = mensaje.trim();

  if (respuesta === '1') {
    // Crear cita
    return await crearCita(conversacion, contexto, estado);
  } else if (respuesta === '0') {
    await limpiarFlujo(conversacion.id);
    return 'Cita cancelada. ¿En qué más puedo ayudarte?';
  } else {
    return 'Por favor responde *1* para confirmar o *0* para cancelar.';
  }
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
        `\n🔗 Ver en panel: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/citas`;

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
    let respuesta = `✅ *¡Cita confirmada!*\n\n`;
    respuesta += `📅 ${fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)}\n`;
    respuesta += `🕐 ${hora}\n`;
    if (cita.propiedad) {
      respuesta += `🏠 ${cita.propiedad.titulo}\n`;
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
