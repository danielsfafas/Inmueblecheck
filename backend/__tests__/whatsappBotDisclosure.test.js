import { describe, it, expect } from '@jest/globals';

describe('Bot de WhatsApp - Divulgación de IA (Requisito Legal)', () => {
  
  function generarMensajePrimerContacto(nombreInmobiliaria, nombreProspecto) {
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

  it('debe incluir divulgación de que es un sistema de IA', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo', 'Juan');
    
    expect(mensaje).toContain('asistente automatizado');
    expect(mensaje).toContain('impulsado por IA');
  });

  it('debe incluir saludo personalizado con nombre', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo', 'Daniel Ortega');
    
    expect(mensaje).toContain('¡Hola Daniel Ortega!');
    expect(mensaje).toContain('Bienvenido');
  });

  it('debe incluir menú de opciones completo', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo', 'Juan');
    
    expect(mensaje).toContain('Propiedades disponibles');
    expect(mensaje).toContain('Información de precios');
    expect(mensaje).toContain('Opciones de financiamiento');
    expect(mensaje).toContain('Agendar una visita');
  });

  it('debe incluir instrucciones para hablar con humano (AGENTE)', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo', 'Juan');
    
    expect(mensaje).toContain('AGENTE');
    expect(mensaje).toContain('hablar con una persona');
  });

  it('debe incluir instrucciones para darse de baja (BAJA)', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo', 'Juan');
    
    expect(mensaje).toContain('BAJA');
    expect(mensaje).toContain('no recibir más mensajes');
  });

  it('debe incluir el nombre de la inmobiliaria', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo', 'Juan');
    
    expect(mensaje).toContain('Casas Hidalgo');
  });

  it('debe ser UN SOLO mensaje completo (no dos)', () => {
    const mensaje = generarMensajePrimerContacto('Casas Hidalgo', 'Daniel Ortega');
    
    // Debe contener TODO en un mensaje:
    expect(mensaje).toContain('¡Hola Daniel Ortega!'); // Saludo personalizado
    expect(mensaje).toContain('asistente automatizado'); // Disclosure
    expect(mensaje).toContain('Puedo mostrarte:'); // Menú
    expect(mensaje).toContain('AGENTE'); // Hints
    
    // Debe tener longitud adecuada (no muy corto)
    expect(mensaje.length).toBeGreaterThan(200);
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
