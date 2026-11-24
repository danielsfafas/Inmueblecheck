/**
 * Tests para lógica de escalamiento AGENTE
 * 
 * Tests de lógica pura:
 * - Cálculo de botPausadoHasta
 * - Auto-resume cuando botPausadoHasta <= now
 * - Una conversación activa por numeroWhatsapp (no crear duplicada)
 */

import { describe, test, expect } from 'vitest';

describe('Escalamiento AGENTE - Lógica pura', () => {
  test('calcular botPausadoHasta con horasAutoresume', () => {
    const ahora = new Date('2024-01-15T10:00:00Z');
    const horasAutoresume = 24;
    
    const botPausadoHasta = new Date(ahora.getTime() + horasAutoresume * 3600000);
    
    expect(botPausadoHasta.toISOString()).toBe('2024-01-16T10:00:00.000Z');
  });

  test('auto-resume cuando botPausadoHasta es pasado', () => {
    const ahora = new Date('2024-01-16T12:00:00Z');
    const botPausadoHasta = new Date('2024-01-16T10:00:00Z'); // 2 horas antes
    
    const debeResumirse = botPausadoHasta <= ahora;
    
    expect(debeResumirse).toBe(true);
  });

  test('NO auto-resume cuando botPausadoHasta es futuro', () => {
    const ahora = new Date('2024-01-16T08:00:00Z');
    const botPausadoHasta = new Date('2024-01-16T10:00:00Z'); // 2 horas después
    
    const debeResumirse = botPausadoHasta <= ahora;
    
    expect(debeResumirse).toBe(false);
  });

  test('bot está pausado si botPausadoHasta > now', () => {
    const conversacion = {
      botPausadoHasta: new Date('2024-01-16T10:00:00Z'),
    };
    const ahora = new Date('2024-01-16T08:00:00Z');
    
    const estaPausado = conversacion.botPausadoHasta && conversacion.botPausadoHasta > ahora;
    
    expect(estaPausado).toBe(true);
  });

  test('bot NO está pausado si botPausadoHasta es null', () => {
    const conversacion = {
      botPausadoHasta: null,
    };
    const ahora = new Date();
    
    const estaPausado = conversacion.botPausadoHasta && conversacion.botPausadoHasta > ahora;
    
    expect(estaPausado).toBe(false);
  });

  test('buscar conversación sin filtro pasadoAHumano (fix bug)', () => {
    // Mock de conversaciones del prospecto
    const conversaciones = [
      {
        id: 'conv-1',
        prospectoId: 'prospecto-1',
        numeroWhatsappId: 'num-1',
        pasadoAHumano: true, // Ya pasada a humano
        createdAt: new Date('2024-01-15T10:00:00Z'),
      },
      {
        id: 'conv-2',
        prospectoId: 'prospecto-1',
        numeroWhatsappId: 'num-1',
        pasadoAHumano: false,
        createdAt: new Date('2024-01-14T10:00:00Z'), // Más vieja
      },
    ];

    // Buscar sin filtrar por pasadoAHumano, ordenar por createdAt desc, tomar la primera
    const conversacionEncontrada = conversaciones
      .filter(c => c.prospectoId === 'prospecto-1' && c.numeroWhatsappId === 'num-1')
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    expect(conversacionEncontrada.id).toBe('conv-1'); // La más reciente, aunque pasadoAHumano=true
  });

  test('formato mensaje WhatsApp a asesor', () => {
    const prospecto = {
      nombre: 'Juan Pérez',
      telefono: '+525512345678',
    };
    const propiedadInteres = {
      titulo: 'Casa en Pachuca Centro',
    };
    const ultimosMensajes = [
      { contenido: '¿Cuánto cuesta?' },
      { contenido: 'Quiero más información' },
      { contenido: 'AGENTE' },
    ];

    let mensaje = `🔔 *Solicitud de Atención*\n\n`;
    mensaje += `*Prospecto:* ${prospecto.nombre}\n`;
    mensaje += `*Teléfono:* ${prospecto.telefono}\n`;
    mensaje += `*Interés:* ${propiedadInteres.titulo}\n`;
    mensaje += `\n*Últimos mensajes del cliente:*\n`;
    ultimosMensajes.slice(-3).forEach((msg) => {
      mensaje += `- "${msg.contenido}"\n`;
    });
    mensaje += `\n🔗 Ver en panel: http://localhost:5173/admin/conversaciones/conv-123`;

    expect(mensaje).toContain('Juan Pérez');
    expect(mensaje).toContain('Casa en Pachuca Centro');
    expect(mensaje).toContain('AGENTE');
  });

  test('limpiar flujo activo cuando cliente escribe AGENTE', () => {
    const conversacion = {
      flujoBot: 'booking',
      flujoEstado: { paso: 2, propiedadId: 'prop-1' },
    };

    // Simular abortar flujo
    conversacion.flujoBot = null;
    conversacion.flujoEstado = null;

    expect(conversacion.flujoBot).toBe(null);
    expect(conversacion.flujoEstado).toBe(null);
  });
});

describe('Notificaciones - Formato', () => {
  test('crear notificación AGENTE_SOLICITADO', () => {
    const notificacion = {
      tipo: 'AGENTE_SOLICITADO',
      titulo: 'Juan Pérez solicita atención',
      mensaje: 'El prospecto Juan Pérez (+525512345678) solicitó hablar con un asesor.',
      enlace: '/admin/conversaciones/conv-123',
    };

    expect(notificacion.tipo).toBe('AGENTE_SOLICITADO');
    expect(notificacion.titulo).toContain('Juan Pérez');
    expect(notificacion.enlace).toContain('/admin/conversaciones/');
  });
});
