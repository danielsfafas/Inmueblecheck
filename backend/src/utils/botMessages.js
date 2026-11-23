/**
 * Genera el mensaje de bienvenida con divulgación de IA (requisito legal LFPDPPP)
 * @param {string} nombreInmobiliaria - Nombre de la inmobiliaria
 * @returns {string} Mensaje de bienvenida
 */
export function generarMensajeBienvenida(nombreInmobiliaria) {
  return `¡Hola! Soy el asistente virtual de ${nombreInmobiliaria}. 🤖\n\n` +
    `Soy un sistema automatizado impulsado por inteligencia artificial. ` +
    `Puedo ayudarte con información sobre propiedades, opciones de crédito y más.\n\n` +
    `¿En qué puedo ayudarte hoy?\n\n` +
    `💡 Escribe AGENTE para hablar con una persona o BAJA para no recibir más mensajes.`;
}
