/**
 * Genera el mensaje de bienvenida con divulgación de IA (requisito legal LFPDPPP)
 * Para primer contacto: incluye saludo personalizado, disclosure, menú y hints
 * @param {string} nombreInmobiliaria - Nombre de la inmobiliaria
 * @param {string} nombreProspecto - Nombre del prospecto (para personalizar)
 * @returns {string} Mensaje de bienvenida completo
 */
export function generarMensajeBienvenida(nombreInmobiliaria, nombreProspecto) {
  return `¡Hola ${nombreProspecto}! 👋 Bienvenido a ${nombreInmobiliaria}.\n\n` +
    `Soy un asistente automatizado impulsado por IA. ` +
    `Estoy aquí para ayudarte a encontrar tu propiedad ideal.\n\n` +
    `Puedo mostrarte:\n` +
    `🏠 Propiedades disponibles\n` +
    `💰 Información de precios\n` +
    `💳 Opciones de financiamiento\n` +
    `📅 Agendar una visita\n\n` +
    `¿Qué te gustaría saber?\n\n` +
    `💡 Escribe *AGENTE* para hablar con una persona o *BAJA* para no recibir más mensajes.`;
}
