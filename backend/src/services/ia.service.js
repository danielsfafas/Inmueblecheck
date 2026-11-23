export async function generarRespuestaIA(mensajeUsuario, contexto) {
  if (process.env.AI_PROVIDER === 'simulado' || !process.env.AI_API_KEY) {
    return generarRespuestaSimulada(mensajeUsuario, contexto);
  }

  // Aquí iría la integración real con OpenAI, Anthropic, Gemini, etc.
  return generarRespuestaSimulada(mensajeUsuario, contexto);
}

function generarRespuestaSimulada(mensajeUsuario, contexto) {
  const mensajeNormalizado = mensajeUsuario.toLowerCase();

  // Respuestas sobre propiedades
  if (mensajeNormalizado.includes('propiedad') || mensajeNormalizado.includes('casa') || 
      mensajeNormalizado.includes('departamento')) {
    
    if (contexto.propiedadesDisponibles.length === 0) {
      return `${contexto.prospecto.nombre}, actualmente no tenemos propiedades disponibles que coincidan con tu búsqueda. ¿Puedes decirme qué tipo de propiedad te interesa y en qué zona?`;
    }

    const props = contexto.propiedadesDisponibles.slice(0, 3);
    let respuesta = `Claro, ${contexto.prospecto.nombre}. Aquí te muestro algunas de nuestras propiedades disponibles:\n\n`;

    props.forEach((p, i) => {
      respuesta += `${i + 1}. *${p.titulo}*\n`;
      respuesta += `   📍 ${p.colonia}, ${p.ciudad}\n`;
      respuesta += `   💰 $${formatearPrecio(p.precio)} MXN\n`;
      respuesta += `   🏠 ${p.recamaras} recámaras, ${p.banos} baños\n`;
      respuesta += `   ${p.tipo === 'VENTA' ? '🏡 Venta' : '🔑 Renta'}\n\n`;
    });

    respuesta += `¿Te gustaría más información sobre alguna de estas propiedades?`;
    return respuesta;
  }

  // Respuestas sobre precio
  if (mensajeNormalizado.includes('precio') || mensajeNormalizado.includes('cuesta') || 
      mensajeNormalizado.includes('cuánto')) {
    return `Los precios de nuestras propiedades varían según ubicación, tamaño y características. Tenemos opciones desde $950,000 MXN hasta $3,850,000 MXN en venta, y desde $4,500 MXN mensuales en renta. ¿Te gustaría que te muestre propiedades en algún rango de precio específico?`;
  }

  // Respuestas sobre financiamiento
  if (mensajeNormalizado.includes('crédito') || mensajeNormalizado.includes('financiamiento') || 
      mensajeNormalizado.includes('banco') || mensajeNormalizado.includes('infonavit')) {
    return `¡Excelente! Trabajamos con diferentes opciones de financiamiento:\n\n• Créditos bancarios\n• Infonavit\n• Fovissste\n• Pago de contado\n\nLa mayoría de nuestras propiedades califican para crédito. ¿Ya cuentas con algún crédito preaprobado?`;
  }

  // Respuestas sobre ubicación
  if (mensajeNormalizado.includes('ubicación') || mensajeNormalizado.includes('donde') || 
      mensajeNormalizado.includes('zona') || mensajeNormalizado.includes('colonia')) {
    return `Nuestras propiedades se encuentran en Tepeapulco y Ciudad Sahagún, Hidalgo. Contamos con casas y departamentos en diferentes colonias. ¿Te interesa alguna zona en particular?`;
  }

  // Respuestas sobre visitas
  if (mensajeNormalizado.includes('visita') || mensajeNormalizado.includes('ver') || 
      mensajeNormalizado.includes('conocer')) {
    return `¡Por supuesto! Me encantaría coordinar una visita para ti. Para agendarte con uno de nuestros asesores y mostrarte la propiedad, escribe *AGENTE* y te atenderá un ejecutivo de inmediato. 📅`;
  }

  // Respuestas sobre requisitos
  if (mensajeNormalizado.includes('requisito') || mensajeNormalizado.includes('necesito') || 
      mensajeNormalizado.includes('documento')) {
    return `Los requisitos varían según el tipo de operación y financiamiento. En general necesitarás:\n\n• Identificación oficial\n• Comprobante de domicilio\n• Comprobante de ingresos\n\nUn asesor puede darte información más detallada. ¿Te gustaría que te contacte uno? Escribe *AGENTE*.`;
  }

  // Respuesta genérica
  return `Gracias por tu mensaje, ${contexto.prospecto.nombre}. Estoy aquí para ayudarte con información sobre nuestras propiedades.\n\nPuedo ayudarte con:\n• Ver propiedades disponibles\n• Información sobre precios\n• Opciones de financiamiento\n• Agendar una visita\n\n¿Qué te gustaría saber?`;
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
