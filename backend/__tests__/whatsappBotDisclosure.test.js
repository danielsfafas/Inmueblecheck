import { describe, it, expect } from '@jest/globals';

describe('Bot de WhatsApp - Divulgación de IA (Requisito Legal)', () => {
  
  function generarMensajePrimerContacto(nombreInmobiliaria) {
    return `¡Hola! Soy el asistente virtual de ${nombreInmobiliaria}. 🤖\n\n` +
      `Soy un sistema automatizado impulsado por inteligencia artificial. ` +
      `Puedo ayudarte con información sobre propiedades, opciones de crédito y más.\n\n` +
      `¿En qué puedo ayudarte hoy?\n\n` +
      `💡 Escribe AGENTE para hablar con una persona o BAJA para no recibir más mensajes.`;
  }

  it('debe incluir divulgación de que es un sistema de IA', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo');
    
    expect(mensaje).toContain('asistente virtual');
    expect(mensaje).toContain('sistema automatizado');
    expect(mensaje).toContain('inteligencia artificial');
  });

  it('debe incluir instrucciones para hablar con humano (AGENTE)', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo');
    
    expect(mensaje).toContain('AGENTE');
    expect(mensaje).toContain('hablar con una persona');
  });

  it('debe incluir instrucciones para darse de baja (BAJA)', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo');
    
    expect(mensaje).toContain('BAJA');
    expect(mensaje).toContain('no recibir más mensajes');
  });

  it('debe incluir el nombre de la inmobiliaria', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo');
    
    expect(mensaje).toContain('Casas Hidalgo');
  });

  it('debe ser claro y en español de México', () => {
    const mensaje = generarMensajePrimerContacto('Test Inmobiliaria');
    
    // Debe usar emoji de robot
    expect(mensaje).toContain('🤖');
    
    // Debe usar lenguaje claro
    expect(mensaje.length).toBeGreaterThan(100); // Mensaje completo
    expect(mensaje).toContain('¿En qué puedo ayudarte');
  });
});

describe('Bot de WhatsApp - Reutilización de Conversaciones', () => {
  
  function buscarConversacionActiva(conversaciones, telefono) {
    // Buscar conversación no pasada a humano para el mismo teléfono
    return conversaciones.find(c => 
      c.telefono === telefono && 
      !c.pasadoAHumano
    );
  }

  it('debe reutilizar conversación existente del mismo teléfono', () => {
    const conversaciones = [
      {
        id: 'conv-123',
        telefono: '7751234567',
        pasadoAHumano: false,
        mensajes: ['Hola', 'Respuesta bot'],
      },
    ];

    const conversacionActiva = buscarConversacionActiva(conversaciones, '7751234567');
    
    expect(conversacionActiva).toBeDefined();
    expect(conversacionActiva.id).toBe('conv-123');
  });

  it('no debe reutilizar conversación pasada a humano', () => {
    const conversaciones = [
      {
        id: 'conv-123',
        telefono: '7751234567',
        pasadoAHumano: true,
        mensajes: ['Hola', 'AGENTE'],
      },
    ];

    const conversacionActiva = buscarConversacionActiva(conversaciones, '7751234567');
    
    expect(conversacionActiva).toBeUndefined();
  });

  it('debe crear nueva conversación solo si no existe activa', () => {
    const conversaciones = [
      {
        id: 'conv-old',
        telefono: '7751234567',
        pasadoAHumano: true,
      },
    ];

    const conversacionActiva = buscarConversacionActiva(conversaciones, '7751234567');
    const debeCrearNueva = !conversacionActiva;
    
    expect(debeCrearNueva).toBe(true);
  });
});
