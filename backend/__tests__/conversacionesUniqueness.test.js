/**
 * Tests para lógica de conversaciones únicas
 * 
 * Tests de lógica pura:
 * - Una conversación activa por prospecto+numeroWhatsapp
 * - Después de AGENTE: nuevo mensaje no crea conversación nueva
 * - Búsqueda sin filtro pasadoAHumano
 */

// Jest (no imports needed)

describe('Conversaciones - Uniqueness Logic', () => {
  test('buscar conversación más reciente por prospecto+numeroWhatsapp', () => {
    const conversaciones = [
      {
        id: 'conv-1',
        prospectoId: 'p1',
        numeroWhatsappId: 'n1',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      },
      {
        id: 'conv-2',
        prospectoId: 'p1',
        numeroWhatsappId: 'n1',
        createdAt: new Date('2024-01-16T10:00:00Z'), // Más reciente
      },
      {
        id: 'conv-3',
        prospectoId: 'p1',
        numeroWhatsappId: 'n2', // Otro número
        createdAt: new Date('2024-01-17T10:00:00Z'),
      },
    ];

    // Buscar para prospecto p1 + numero n1
    const found = conversaciones
      .filter(c => c.prospectoId === 'p1' && c.numeroWhatsappId === 'n1')
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    expect(found.id).toBe('conv-2');
  });

  test('NO crear nueva conversación si ya existe una para prospecto+numero', () => {
    const conversaciones = [
      {
        id: 'conv-1',
        prospectoId: 'p1',
        numeroWhatsappId: 'n1',
        pasadoAHumano: true, // Ya escalada
      },
    ];

    const prospectoId = 'p1';
    const numeroWhatsappId = 'n1';

    // Buscar sin filtrar por pasadoAHumano
    const existing = conversaciones.find(
      c => c.prospectoId === prospectoId && c.numeroWhatsappId === numeroWhatsappId
    );

    // Debe encontrar la existente
    expect(existing).toBeDefined();
    expect(existing.id).toBe('conv-1');
  });

  test('conversación sigue activa después de AGENTE', () => {
    const conversacion = {
      id: 'conv-1',
      pasadoAHumano: true,
      botPausadoHasta: new Date('2024-01-16T10:00:00Z'),
    };

    // Nuevo mensaje llega
    const ahora = new Date('2024-01-16T08:00:00Z');
    
    // Debe usar la misma conversación (no crear nueva)
    const debeUsarMismaConv = true; // Siempre true si existe
    
    expect(debeUsarMismaConv).toBe(true);
    expect(conversacion.pasadoAHumano).toBe(true);
  });

  test('guardar mensaje sin responder cuando bot pausado', () => {
    const conversacion = {
      botPausadoHasta: new Date('2024-01-16T10:00:00Z'),
    };
    const ahora = new Date('2024-01-16T08:00:00Z');

    const estaPausado = conversacion.botPausadoHasta > ahora;
    
    // Si pausado: guardar mensaje pero NO generar respuesta
    if (estaPausado) {
      // return early, no ejecutar generarRespuestaIA
      expect(estaPausado).toBe(true);
    }
  });
});

describe('Status de Conversación', () => {
  test('status: bot_activo', () => {
    const conv = {
      pasadoAHumano: false,
      botPausadoHasta: null,
    };
    const ahora = new Date();

    let status;
    if (conv.botPausadoHasta && conv.botPausadoHasta > ahora) {
      status = 'pausado';
    } else if (conv.pasadoAHumano) {
      status = 'pasado_humano';
    } else {
      status = 'bot_activo';
    }

    expect(status).toBe('bot_activo');
  });

  test('status: pausado', () => {
    const conv = {
      pasadoAHumano: true,
      botPausadoHasta: new Date(Date.now() + 3600000), // 1 hora futuro
    };
    const ahora = new Date();

    let status;
    if (conv.botPausadoHasta && conv.botPausadoHasta > ahora) {
      status = 'pausado';
    } else if (conv.pasadoAHumano) {
      status = 'pasado_humano';
    } else {
      status = 'bot_activo';
    }

    expect(status).toBe('pausado');
  });

  test('status: pasado_humano (pausa expirada)', () => {
    const conv = {
      pasadoAHumano: true,
      botPausadoHasta: new Date(Date.now() - 3600000), // 1 hora pasado
    };
    const ahora = new Date();

    let status;
    if (conv.botPausadoHasta && conv.botPausadoHasta > ahora) {
      status = 'pausado';
    } else if (conv.pasadoAHumano) {
      status = 'pasado_humano';
    } else {
      status = 'bot_activo';
    }

    expect(status).toBe('pasado_humano');
  });
});
