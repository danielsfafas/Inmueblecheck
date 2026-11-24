/**
 * Tests de conversaciones del bot WhatsApp
 * 25+ conversaciones multi-turn con datos reales
 */
import { describe, it, expect } from '@jest/globals';
import { generarRespuestaIA } from '../src/services/ia.service.js';

// Mock de contexto base
function crearContexto(overrides = {}) {
  return {
    inmobiliaria: {
      nombre: 'Inmobiliaria Test',
      telefono: '+5215512345678',
      domicilio: 'Av. Principal 123, Tepeapulco',
      horario: 'Lunes a Viernes 9:00-18:00',
      emailPrivacidad: 'contacto@test.com',
    },
    prospecto: {
      id: 'test-id',
      nombre: 'Juan Pérez',
      presupuesto: null,
      formaPago: null,
    },
    mensajesPrevios: [],
    ultimaPreguntaBot: null,
    propiedadesDisponibles: [
      {
        id: 'prop-1',
        titulo: 'Casa en Centro Tepeapulco',
        tipo: 'VENTA',
        precio: 1500000,
        colonia: 'Centro',
        ciudad: 'Tepeapulco',
        recamaras: 3,
        banos: 2,
      },
      {
        id: 'prop-2',
        titulo: 'Departamento en Sahagún',
        tipo: 'RENTA',
        precio: 5000,
        colonia: 'Col. Morelos',
        ciudad: 'Ciudad Sahagún',
        recamaras: 2,
        banos: 1,
      },
      {
        id: 'prop-3',
        titulo: 'Casa en Apan',
        tipo: 'VENTA',
        precio: 950000,
        colonia: 'Col. Jardines',
        ciudad: 'Apan',
        recamaras: 2,
        banos: 1,
      },
      {
        id: 'prop-4',
        titulo: 'Terreno en Sahagún',
        tipo: 'VENTA',
        precio: 500000,
        colonia: 'Fracc. Los Pinos',
        ciudad: 'Ciudad Sahagún',
        recamaras: 0,
        banos: 0,
      },
      {
        id: 'prop-5',
        titulo: 'Casa Residencial Tepeapulco',
        tipo: 'VENTA',
        precio: 2850000,
        colonia: 'Fracc. Los Álamos',
        ciudad: 'Tepeapulco',
        recamaras: 4,
        banos: 3,
      },
    ],
    ...overrides,
  };
}

describe('Bot WhatsApp - Conversaciones Multi-turn', () => {

  // 1. CONVERSACIÓN: Saludo → Ver propiedades → Más info
  it('Conversación 1: Saludo y exploración básica', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Hola', ctx);
    expect(r1).toContain('Hola Juan Pérez');
    expect(r1).toContain('Inmobiliaria Test');
    
    const r2 = generarRespuestaIA('Ver propiedades', ctx);
    expect(r2).toContain('Casa en Centro Tepeapulco');
    expect(r2).toContain('1,500,000');
  });

  // 2. CONVERSACIÓN: Presupuesto → Filtrado
  it('Conversación 2: Cliente con presupuesto definido', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Tengo 1 millón para comprar', ctx);
    expect(r1).toContain('1,000,000') || expect(r1).toContain('950,000'); // Debe mostrar Casa en Apan
    expect(r1).toContain('Apan');
  });

  // 3. CONVERSACIÓN: Crédito → No preaprobado → Opciones
  it('Conversación 3: Opciones de financiamiento sin crédito preaprobado', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Opciones de financiamiento', ctx);
    expect(r1).toContain('bancarios') || expect(r1).toContain('Infonavit');
    expect(r1).toContain('crédito preaprobado');
    
    const ctx2 = { ...ctx, ultimaPreguntaBot: '¿Ya cuentas con algún crédito preaprobado?' };
    const r2 = generarRespuestaIA('No', ctx2);
    expect(r2).toContain('Precalificación') || expect(r2).toContain('opciones');
    expect(r2).not.toContain('actualmente no tenemos'); // No debe decir "no hay"
  });

  // 4. CONVERSACIÓN: Zona específica
  it('Conversación 4: Buscar en zona específica (Sahagún)', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Me interesa en Sahagún', ctx);
    expect(r1).toContain('Sahagún');
    expect(r1).toContain('500,000') || expect(r1).toContain('5,000'); // Terreno o Depto
  });

  // 5. CONVERSACIÓN: Tipo casa
  it('Conversación 5: Buscar solo casas', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Busco una casa', ctx);
    expect(r1).toContain('Casa');
    expect(r1).not.toContain('Departamento');
  });

  // 6. CONVERSACIÓN: Renta
  it('Conversación 6: Buscar renta', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Quiero rentar', ctx);
    expect(r1).toContain('renta');
    expect(r1).toContain('5,000'); // Departamento en renta
  });

  // 7. CONVERSACIÓN: Más barata
  it('Conversación 7: Propiedad más económica', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Cuál es la más barata', ctx);
    expect(r1).toContain('500,000'); // Terreno es la más barata
    expect(r1).toContain('Terreno');
  });

  // 8. CONVERSACIÓN: Número de recámaras
  it('Conversación 8: Filtrar por recámaras', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Busco con 3 recámaras', ctx);
    expect(r1).toContain('3 recámara');
    expect(r1).toContain('Centro Tepeapulco');
  });

  // 9. CONVERSACIÓN: Info de propiedad por número
  it('Conversación 9: Más info de propiedad específica', () => {
    const ctx = crearContexto();
    
    // Primero mostrar lista
    const r1 = generarRespuestaIA('Ver propiedades', ctx);
    expect(r1).toContain('1.');
    
    // Luego pedir info de la 2
    const r2 = generarRespuestaIA('Más info de la 2', ctx);
    expect(r2).toContain('Departamento en Sahagún');
    expect(r2).toContain('5,000');
  });

  // 10. CONVERSACIÓN: Fotos
  it('Conversación 10: Solicitar fotos', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Tienen fotos?', ctx);
    expect(r1).toContain('fotos') || expect(r1).toContain('página web');
  });

  // 11. CONVERSACIÓN: Agendar visita
  it('Conversación 11: Agendar visita', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Quiero agendar una visita', ctx);
    expect(r1).toContain('AGENTE') || expect(r1).toContain('asesor');
  });

  // 12. CONVERSACIÓN: Precio general
  it('Conversación 12: Consultar rangos de precio', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Cuánto cuestan', ctx);
    expect(r1).toContain('500,000') || expect(r1).toContain('2,850,000');
    expect(r1).toContain('desde') || expect(r1).toContain('hasta');
  });

  // 13. CONVERSACIÓN: Ubicación/dirección
  it('Conversación 13: Consultar ubicación oficina', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Dónde están ubicados', ctx);
    expect(r1).toContain('Tepeapulco') || expect(r1).toContain('Sahagún');
    expect(r1).toContain('Av. Principal');
  });

  // 14. CONVERSACIÓN: Horarios
  it('Conversación 14: Consultar horarios', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Qué horario tienen', ctx);
    expect(r1).toContain('Lunes') || expect(r1).toContain('9:00');
  });

  // 15. CONVERSACIÓN: Contacto
  it('Conversación 15: Solicitar contacto', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Cómo los contacto', ctx);
    expect(r1).toContain('+5215512345678') || expect(r1).toContain('contacto@test.com');
  });

  // 16. CONVERSACIÓN: Gracias
  it('Conversación 16: Despedida amable', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Muchas gracias por la info', ctx);
    expect(r1).toContain('gusto') || expect(r1).toContain('excelente día');
  });

  // 17. CONVERSACIÓN: Adiós
  it('Conversación 17: Despedida', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Adiós', ctx);
    expect(r1).toContain('pronto') || expect(r1).toContain('excelente día');
  });

  // 18. CONVERSACIÓN: Crédito Infonavit específico
  it('Conversación 18: Consulta Infonavit', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Aceptan Infonavit?', ctx);
    expect(r1).toContain('Infonavit');
    expect(r1).toContain('crédito') || expect(r1).toContain('califican');
  });

  // 19. CONVERSACIÓN: Presupuesto con decimales
  it('Conversación 19: Presupuesto con millones decimales', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Tengo 1.5 millones', ctx);
    expect(r1).toContain('1,500,000') || expect(r1).toContain('Centro Tepeapulco');
  });

  // 20. CONVERSACIÓN: Presupuesto alto
  it('Conversación 20: Presupuesto alto', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Busco algo de 3 millones', ctx);
    expect(r1).toContain('2,850,000'); // Casa Residencial
    expect(r1).toContain('Residencial');
  });

  // 21. CONVERSACIÓN: Zona sin resultados
  it('Conversación 21: Zona sin propiedades disponibles', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Tienen en Pachuca', ctx);
    // Debe ofrecer alternativas, no solo decir "no hay"
    expect(r1.length).toBeGreaterThan(50); // Respuesta con contenido
  });

  // 22. CONVERSACIÓN: Departamentos (sin resultados en venta)
  it('Conversación 22: Buscar departamentos', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Me interesan los departamentos', ctx);
    expect(r1).toContain('Departamento') || expect(r1).toContain('opciones');
  });

  // 23. CONVERSACIÓN: Venta (filtro operación)
  it('Conversación 23: Buscar en venta', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Quiero comprar', ctx);
    expect(r1).toContain('venta') || expect(r1).toContain('Casa') || expect(r1).toContain('Terreno');
  });

  // 24. CONVERSACIÓN: Respuesta a "Sí" sin contexto
  it('Conversación 24: Respuesta Sí genérica', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Sí', ctx);
    expect(r1.length).toBeGreaterThan(10); // Debe responder algo
  });

  // 25. CONVERSACIÓN: Mensaje fuera de tema
  it('Conversación 25: Mensaje fuera de tema', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Qué hora es', ctx);
    expect(r1).toContain('puedo ayudarte') || expect(r1).toContain('AGENTE');
    expect(r1).not.toContain('Hola'); // No debe repetir saludo inicial
  });

  // 26. CONVERSACIÓN: Recámaras sin resultados
  it('Conversación 26: Filtro recámaras sin resultados', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Busco con 5 recámaras', ctx);
    expect(r1).toContain('No tengo') || expect(r1).toContain('otras opciones');
    // Debe ofrecer alternativas
  });

  // 27. CONVERSACIÓN: Crédito bancario
  it('Conversación 27: Consulta crédito bancario', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Qué bancos aceptan', ctx);
    expect(r1).toContain('banco') || expect(r1).toContain('crédito');
  });

  // 28. CONVERSACIÓN: Contexto crédito preaprobado SÍ
  it('Conversación 28: Cliente con crédito preaprobado', () => {
    const ctx = crearContexto({
      ultimaPreguntaBot: '¿Ya cuentas con algún crédito preaprobado?',
    });
    
    const r1 = generarRespuestaIA('Sí', ctx);
    expect(r1).toContain('monto') || expect(r1).toContain('presupuesto');
    expect(r1).not.toContain('Precalificación'); // No debe ofrecer precalificar
  });

  // 29. CONVERSACIÓN: Lista vacía de propiedades
  it('Conversación 29: Sin propiedades disponibles', () => {
    const ctx = crearContexto({
      propiedadesDisponibles: [],
    });
    
    const r1 = generarRespuestaIA('Ver propiedades', ctx);
    expect(r1).toContain('actualizando') || expect(r1).toContain('asesor');
  });

  // 30. CONVERSACIÓN: Combinación zona + tipo
  it('Conversación 30: Filtro combinado', () => {
    const ctx = crearContexto();
    
    const r1 = generarRespuestaIA('Casa en Apan', ctx);
    expect(r1).toContain('Apan');
    expect(r1).toContain('950,000');
  });

});

export { crearContexto };
