import { actualizarProspecto } from './whatsappBot.service.js';
import { construirUrlPropiedad } from '../utils/publicUrl.js';

export async function generarRespuestaIA(mensajeUsuario, contexto) {
  if (process.env.AI_PROVIDER === 'simulado' || !process.env.AI_API_KEY) {
    return generarRespuestaSimulada(mensajeUsuario, contexto);
  }

  // Aquí iría la integración real con OpenAI, Anthropic, Gemini, etc.
  return generarRespuestaSimulada(mensajeUsuario, contexto);
}

/**
 * Motor de intents mejorado para bot WhatsApp
 * Detecta intenciones y maneja contexto conversacional
 */
function generarRespuestaSimulada(mensajeUsuario, contexto) {
  const mensaje = mensajeUsuario.toLowerCase().trim();
  const { inmobiliaria, prospecto, ultimaPreguntaBot, propiedadesDisponibles } = contexto;

  // 1. SALUDOS (inicio de conversación)
  if (detectarIntent(mensaje, ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal'])) {
    return `¡Hola ${prospecto.nombre}! 👋 Bienvenido a ${inmobiliaria.nombre}.\n\n` +
           `Estoy aquí para ayudarte a encontrar tu propiedad ideal.\n\n` +
           `Puedo mostrarte:\n` +
           `🏠 Propiedades disponibles\n` +
           `💰 Información de precios\n` +
           `💳 Opciones de financiamiento\n` +
           `📅 Agendar una visita\n\n` +
           `¿Qué te gustaría saber?`;
  }

  // 2. SÍ/NO contextual (depende de última pregunta del bot)
  if (ultimaPreguntaBot && detectarIntent(mensaje, ['sí', 'si', 'yes', 'claro', 'por supuesto', 'afirmativo'])) {
    if (ultimaPreguntaBot.includes('crédito preaprobado')) {
      return `¡Excelente! 🎉 Que cuentes con crédito preaprobado facilita mucho el proceso.\n\n` +
             `¿Podrías compartirme el monto preaprobado? Así puedo mostrarte propiedades que se ajusten a tu presupuesto.`;
    }
    return `Perfecto, ¿en qué más puedo ayudarte?`;
  }

  if (ultimaPreguntaBot && detectarIntent(mensaje, ['no', 'nope', 'nel', 'negativo', 'no tengo', 'aún no'])) {
    if (ultimaPreguntaBot.includes('crédito preaprobado')) {
      return `No hay problema. Existen varias opciones:\n\n` +
             `1️⃣ **Precalificación**: Puedo conectarte con un asesor para que te ayude a precalificar con bancos o Infonavit\n\n` +
             `2️⃣ **Pago de contado**: Si prefieres esta opción, tenemos propiedades disponibles\n\n` +
             `3️⃣ **Ver propiedades primero**: Puedes explorar nuestro catálogo y decidir después\n\n` +
             `¿Cuál te interesa más? O si gustas, escribe *AGENTE* para hablar directamente con un asesor.`;
    }
    return `Entendido. ¿Hay algo más en lo que pueda ayudarte?`;
  }

  // 3. PRESUPUESTO (detectar montos)
  const presupuestoDetectado = detectarPresupuesto(mensaje);
  if (presupuestoDetectado) {
    // Actualizar prospecto
    actualizarProspecto(prospecto.id, { presupuesto: presupuestoDetectado }).catch(console.error);
    
    const propsFiltradas = filtrarPropiedades(propiedadesDisponibles, { presupuestoMax: presupuestoDetectado * 1.1 });
    
    if (propsFiltradas.length > 0) {
      return formatearListaPropiedades(propsFiltradas, inmobiliaria) +
             `\n\n¿Te interesa conocer más detalles de alguna?`;
    }
    return `Con un presupuesto de ${formatearPrecio(presupuestoDetectado)} MXN, déjame buscar las mejores opciones para ti.\n\n` +
           `¿Prefieres casa o departamento? ¿En qué zona te gustaría?`;
  }

  // 4. ZONA (detectar ubicaciones)
  const zonaDetectada = detectarZona(mensaje);
  if (zonaDetectada) {
    const propsFiltradas = filtrarPropiedades(propiedadesDisponibles, { zona: zonaDetectada });
    
    if (propsFiltradas.length > 0) {
      return `Propiedades en ${zonaDetectada}:\n\n` +
             formatearListaPropiedades(propsFiltradas, inmobiliaria) +
             `\n\n¿Cuál te gustaría conocer mejor?`;
    }
    return `En ${zonaDetectada} actualmente no tengo propiedades, pero te puedo mostrar opciones cercanas.\n\n` +
           formatearListaPropiedades(propiedadesDisponibles.slice(0, 3), inmobiliaria);
  }

  // 5. VER/MOSTRAR PROPIEDADES
  if (detectarIntent(mensaje, ['ver propiedades', 'mostrar propiedades', 'qué propiedades', 'cuáles propiedades', 'propiedades disponibles', 'catálogo'])) {
    if (propiedadesDisponibles.length === 0) {
      return `${prospecto.nombre}, actualmente estamos actualizando nuestro catálogo. ` +
             `¿Te gustaría que un asesor te contacte para mostrarte las opciones más recientes? Escribe *AGENTE*.`;
    }
    
    return formatearListaPropiedades(propiedadesDisponibles.slice(0, 5), inmobiliaria) +
           `\n\n¿Te interesa alguna en particular?`;
  }

  // 6. TIPO DE PROPIEDAD
  if (detectarIntent(mensaje, ['casa', 'casas'])) {
    const casas = filtrarPropiedades(propiedadesDisponibles, { tipo: 'casa' });
    if (casas.length > 0) {
      return `Nuestras casas disponibles:\n\n` +
             formatearListaPropiedades(casas, inmobiliaria);
    }
    return `Actualmente no tenemos casas disponibles, pero tenemos otras opciones que podrían interesarte:\n\n` +
           formatearListaPropiedades(propiedadesDisponibles.slice(0, 3), inmobiliaria);
  }

  if (detectarIntent(mensaje, ['departamento', 'depas', 'depa'])) {
    const deptos = filtrarPropiedades(propiedadesDisponibles, { tipo: 'departamento' });
    if (deptos.length > 0) {
      return `Nuestros departamentos disponibles:\n\n` +
             formatearListaPropiedades(deptos, inmobiliaria);
    }
    return `Actualmente no tenemos departamentos disponibles. Te muestro otras opciones:\n\n` +
           formatearListaPropiedades(propiedadesDisponibles.slice(0, 3), inmobiliaria);
  }

  // 7. OPERACIÓN (venta/renta)
  if (detectarIntent(mensaje, ['comprar', 'venta', 'en venta', 'para comprar'])) {
    const ventas = filtrarPropiedades(propiedadesDisponibles, { operacion: 'VENTA' });
    if (ventas.length > 0) {
      return `Propiedades en venta:\n\n` +
             formatearListaPropiedades(ventas, inmobiliaria);
    }
  }

  if (detectarIntent(mensaje, ['rentar', 'renta', 'en renta', 'arrendar', 'alquiler'])) {
    const rentas = filtrarPropiedades(propiedadesDisponibles, { operacion: 'RENTA' });
    if (rentas.length > 0) {
      return `Propiedades en renta:\n\n` +
             formatearListaPropiedades(rentas, inmobiliaria);
    }
  }

  // 8. MÁS BARATA / MÁS ECONÓMICA
  if (detectarIntent(mensaje, ['más barata', 'más económica', 'más accesible', 'la más económica', 'la más barata'])) {
    const ordenadas = [...propiedadesDisponibles].sort((a, b) => Number(a.precio) - Number(b.precio));
    if (ordenadas.length > 0) {
      return `La opción más económica es:\n\n` +
             formatearListaPropiedades([ordenadas[0]], inmobiliaria) +
             `\n\n¿Te gustaría más información sobre esta propiedad?`;
    }
  }

  // 9. INFO DE PROPIEDAD ESPECÍFICA (por número o nombre)
  const numeroPropiedad = detectarNumeroPropiedad(mensaje);
  if (numeroPropiedad && numeroPropiedad <= propiedadesDisponibles.length) {
    const prop = propiedadesDisponibles[numeroPropiedad - 1];
    return formatearDetallePropiedad(prop, inmobiliaria);
  }

  // 10. FOTOS / IMÁGENES
  if (detectarIntent(mensaje, ['fotos', 'imágenes', 'imá genes', 'ver fotos', 'tiene fotos', 'envía fotos'])) {
    return `Para ver las fotos de nuestras propiedades, puedes:\n\n` +
           `1️⃣ Visitar nuestra página web\n` +
           `2️⃣ Escribe el número de la propiedad que te interesa y te envío el enlace\n` +
           `3️⃣ Agenda una visita presencial escribiendo *AGENTE*\n\n` +
           `¿Qué prefieres?`;
  }

  // 11. AGENDAR VISITA (inicia flujo booking)
  if (detectarIntent(mensaje, ['agendar', 'visita', 'ver la casa', 'ver el depa', 'conocer', 'visitar', 'cita'])) {
    // Será manejado por citasFlow.service.js
    return '__INICIAR_FLUJO_BOOKING__';
  }

  // 12. FINANCIAMIENTO / CRÉDITO
  if (detectarIntent(mensaje, ['financiamiento', 'crédito', 'banco', 'infonavit', 'fovissste', 'hipoteca'])) {
    return `Trabajamos con diferentes opciones de financiamiento:\n\n` +
           `💳 **Créditos bancarios**: BBVA, Santander, Banorte\n` +
           `🏠 **Infonavit**: Para trabajadores con cotización\n` +
           `🏛️ **Fovissste**: Para trabajadores del gobierno\n` +
           `💰 **Pago de contado**: Con beneficios especiales\n\n` +
           `La mayoría de nuestras propiedades califican para crédito.\n\n` +
           `¿Ya cuentas con algún crédito preaprobado?`;
  }

  // 13. PRECIO / CUÁNTO CUESTA
  if (detectarIntent(mensaje, ['precio', 'cuánto cuesta', 'cuanto vale', 'costo'])) {
    if (propiedadesDisponibles.length > 0) {
      const precios = propiedadesDisponibles.map(p => Number(p.precio)).filter(p => p > 0);
      const min = Math.min(...precios);
      const max = Math.max(...precios);
      
      return `Nuestras propiedades van desde ${formatearPrecio(min)} hasta ${formatearPrecio(max)} MXN.\n\n` +
             `¿Tienes algún presupuesto en mente? Así puedo mostrarte las mejores opciones.`;
    }
    return `Los precios varían según la propiedad. ¿Tienes algún presupuesto en mente?`;
  }

  // 14. RECÁMARAS
  const recamaras = detectarRecamaras(mensaje);
  if (recamaras) {
    const propsFiltradas = filtrarPropiedades(propiedadesDisponibles, { recamaras });
    if (propsFiltradas.length > 0) {
      return `Propiedades con ${recamaras} recámara${recamaras > 1 ? 's' : ''}:\n\n` +
             formatearListaPropiedades(propsFiltradas, inmobiliaria);
    }
    return `No tengo propiedades con ${recamaras} recámaras disponibles en este momento, pero te muestro otras opciones:\n\n` +
           formatearListaPropiedades(propiedadesDisponibles.slice(0, 3), inmobiliaria);
  }

  // 15. UBICACIÓN / DIRECCIÓN
  if (detectarIntent(mensaje, ['ubicación', 'dirección', 'dónde están', 'donde quedan', 'cómo llego'])) {
    return `Nuestras propiedades están en diferentes zonas de Tepeapulco y Ciudad Sahagún, Hidalgo.\n\n` +
           `Puedes visitarnos en nuestra oficina:\n` +
           `📍 ${inmobiliaria.domicilio || 'Contáctanos para más información'}\n\n` +
           `O si prefieres, escribe *AGENTE* para que un asesor te guíe.`;
  }

  // 16. HORARIOS
  if (detectarIntent(mensaje, ['horario', 'hora', 'abierto', 'atienden', 'cuándo'])) {
    return `Nuestro horario de atención es:\n` +
           `🕐 ${inmobiliaria.horario || 'Lunes a Viernes de 9:00 AM a 6:00 PM'}\n\n` +
           `Para visitas a propiedades, escribe *AGENTE* y agendamos contigo.`;
  }

  // 17. CONTACTO / TELÉFONO
  if (detectarIntent(mensaje, ['contacto', 'teléfono', 'whatsapp', 'llamar'])) {
    return `Puedes contactarnos:\n` +
           `📱 ${inmobiliaria.telefono || 'WhatsApp disponible'}\n` +
           `📧 ${inmobiliaria.emailPrivacidad || 'Escribe AGENTE para contacto directo'}\n\n` +
           `O si prefieres, escribe *AGENTE* para hablar con un asesor ahora.`;
  }

  // 18. GRACIAS / DESPEDIDA
  if (detectarIntent(mensaje, ['gracias', 'thank', 'muchas gracias', 'te agradezco', 'excelente', 'perfecto'])) {
    return `¡Con gusto, ${prospecto.nombre}! 😊\n\n` +
           `Estoy aquí cuando necesites más información. ¡Que tengas un excelente día!`;
  }

  if (detectarIntent(mensaje, ['adiós', 'adios', 'bye', 'hasta luego', 'nos vemos', 'chao'])) {
    return `¡Hasta pronto, ${prospecto.nombre}! 👋\n\n` +
           `Cuando gustes, escríbeme de nuevo. ¡Que tengas un excelente día!`;
  }

  // 19. HABLAR CON HUMANO (ya manejado en whatsappBot.service.js pero por si acaso)
  if (detectarIntent(mensaje, ['agente', 'humano', 'asesor', 'persona', 'hablar con alguien'])) {
    return `Perfecto, en un momento un asesor se pondrá en contacto contigo. ¡Gracias por tu paciencia!`;
  }

  // 20. RESPUESTA GENÉRICA (no repetir menú completo cada vez)
  return `Disculpa, no estoy seguro de entender. 🤔\n\n` +
         `Puedo ayudarte con:\n` +
         `• Ver propiedades\n` +
         `• Información de precios\n` +
         `• Opciones de financiamiento\n` +
         `• Agendar una visita\n\n` +
         `O escribe *AGENTE* para hablar con un asesor.`;
}

// FUNCIONES HELPER

function detectarIntent(mensaje, palabrasClave) {
  return palabrasClave.some(palabra => mensaje.includes(palabra.toLowerCase()));
}

function detectarPresupuesto(mensaje) {
  // Detectar montos: "tengo 1.5 millones", "1500000", "1.5m", "un millón"
  const patrones = [
    /(\d+\.?\d*)\s*(millones?|mdp|m)/i,
    /(\d{5,})/,
    /(un|1)\s*millón/i,
    /(\d+\.?\d*)\s*mil/i,
  ];

  for (const patron of patrones) {
    const match = mensaje.match(patron);
    if (match) {
      let monto = parseFloat(match[1] || 1);
      if (mensaje.includes('millon') || mensaje.includes('mdp') || mensaje.includes(' m')) {
        monto *= 1000000;
      } else if (mensaje.includes('mil')) {
        monto *= 1000;
      }
      return monto;
    }
  }
  return null;
}

function detectarZona(mensaje) {
  const zonas = ['sahagún', 'sahagun', 'tepeapulco', 'apan', 'centro'];
  for (const zona of zonas) {
    if (mensaje.includes(zona)) {
      return zona.charAt(0).toUpperCase() + zona.slice(1);
    }
  }
  return null;
}

function detectarRecamaras(mensaje) {
  const match = mensaje.match(/(\d+)\s*(recámara|recamara|habitación|habitacion|cuarto)/i);
  return match ? parseInt(match[1]) : null;
}

function detectarNumeroPropiedad(mensaje) {
  // "más info de la 2", "la propiedad 3", "la número 1"
  const match = mensaje.match(/(?:propiedad|la|número|numero)\s*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function filtrarPropiedades(propiedades, filtros) {
  let resultado = [...propiedades];

  if (filtros.presupuestoMax) {
    resultado = resultado.filter(p => Number(p.precio) <= filtros.presupuestoMax);
  }

  if (filtros.zona) {
    resultado = resultado.filter(p => 
      (p.colonia && p.colonia.toLowerCase().includes(filtros.zona.toLowerCase())) ||
      (p.ciudad && p.ciudad.toLowerCase().includes(filtros.zona.toLowerCase()))
    );
  }

  if (filtros.tipo) {
    resultado = resultado.filter(p => 
      p.tipo && p.tipo.toLowerCase().includes(filtros.tipo.toLowerCase())
    );
  }

  if (filtros.operacion) {
    resultado = resultado.filter(p => p.tipo === filtros.operacion);
  }

  if (filtros.recamaras) {
    resultado = resultado.filter(p => p.recamaras === filtros.recamaras);
  }

  return resultado;
}

export function formatearListaPropiedades(propiedades, inmobiliaria) {
  if (propiedades.length === 0) {
    return `No encontré propiedades con esas características, pero puedes escribir *AGENTE* para que un asesor te ayude.`;
  }

  let respuesta = '';
  propiedades.slice(0, 5).forEach((p, i) => {
    respuesta += `${i + 1}. *${p.titulo}*\n`;
    respuesta += `   📍 ${p.colonia || ''}, ${p.ciudad || ''}\n`;
    respuesta += `   💰 ${formatearPrecio(p.precio)} MXN\n`;
    if (p.recamaras) respuesta += `   🛏️ ${p.recamaras} rec, ${p.banos} baños\n`;
    respuesta += `   🔗 Ver más: ${construirUrlPropiedad(p.id, inmobiliaria)}\n\n`;
  });

  return respuesta;
}

export function formatearDetallePropiedad(prop, inmobiliaria) {
  let respuesta = `*${prop.titulo}*\n\n`;
  respuesta += `📍 ${prop.colonia}, ${prop.ciudad}\n`;
  respuesta += `💰 ${formatearPrecio(prop.precio)} MXN\n`;
  if (prop.recamaras) respuesta += `🛏️ ${prop.recamaras} recámaras, ${prop.banos} baños\n`;
  respuesta += `\n🔗 Ver fotos y más detalles:\n`;
  respuesta += `${construirUrlPropiedad(prop.id, inmobiliaria)}\n\n`;
  respuesta += `¿Te gustaría agendar una visita? Escribe *AGENTE*.`;
  
  return respuesta;
}

function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-MX').format(precio);
}

export async function generarVideoPropiedad(propiedadId) {
  console.log(`[SIMULADO] Generando video para propiedad ${propiedadId}`);
  
  return {
    url: `/api/videos/${propiedadId}.mp4`,
    duracion: 15,
    formato: 'vertical',
    resolucion: '1080x1920',
  };
}
