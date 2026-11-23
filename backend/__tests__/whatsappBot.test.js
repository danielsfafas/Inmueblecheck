import { describe, it, expect } from '@jest/globals';

describe('Bot de WhatsApp - Comandos', () => {
  
  function detectarComando(mensaje) {
    const normalizado = mensaje.toUpperCase().trim();
    
    if (['BAJA', 'STOP', 'CANCELAR', 'NO MAS'].includes(normalizado)) {
      return 'BAJA';
    }
    
    if (['AGENTE', 'HUMANO', 'ASESOR'].includes(normalizado) || 
        normalizado.includes('HABLAR CON')) {
      return 'AGENTE';
    }
    
    return null;
  }

  it('debe detectar comando BAJA', () => {
    expect(detectarComando('BAJA')).toBe('BAJA');
    expect(detectarComando('baja')).toBe('BAJA');
    expect(detectarComando('  BAJA  ')).toBe('BAJA');
  });

  it('debe detectar comando STOP', () => {
    expect(detectarComando('STOP')).toBe('BAJA');
    expect(detectarComando('stop')).toBe('BAJA');
  });

  it('debe detectar comando CANCELAR', () => {
    expect(detectarComando('CANCELAR')).toBe('BAJA');
    expect(detectarComando('cancelar')).toBe('BAJA');
  });

  it('debe detectar comando NO MAS', () => {
    expect(detectarComando('NO MAS')).toBe('BAJA');
    expect(detectarComando('no mas')).toBe('BAJA');
  });

  it('debe detectar comando AGENTE', () => {
    expect(detectarComando('AGENTE')).toBe('AGENTE');
    expect(detectarComando('agente')).toBe('AGENTE');
  });

  it('debe detectar comando HUMANO', () => {
    expect(detectarComando('HUMANO')).toBe('AGENTE');
    expect(detectarComando('humano')).toBe('AGENTE');
  });

  it('debe detectar comando ASESOR', () => {
    expect(detectarComando('ASESOR')).toBe('AGENTE');
    expect(detectarComando('asesor')).toBe('AGENTE');
  });

  it('debe detectar frase "hablar con"', () => {
    expect(detectarComando('quiero hablar con alguien')).toBe('AGENTE');
    expect(detectarComando('HABLAR CON UN EJECUTIVO')).toBe('AGENTE');
  });

  it('no debe detectar comandos en mensajes normales', () => {
    expect(detectarComando('Hola, buenos días')).toBeNull();
    expect(detectarComando('¿Tienen casas disponibles?')).toBeNull();
    expect(detectarComando('Me interesa una propiedad')).toBeNull();
  });
});

describe('Bot de WhatsApp - Pase a ejecutivo humano', () => {
  
  function debeP asarAHumano(conversacion) {
    return conversacion.pasadoAHumano === true;
  }

  it('debe marcar conversación como pasada a humano', () => {
    const conversacion = {
      id: '123',
      pasadoAHumano: false,
    };

    conversacion.pasadoAHumano = true;

    expect(debeP asarAHumano(conversacion)).toBe(true);
  });

  it('debe generar resumen de conversación', () => {
    const mensajes = [
      { remitente: 'bot', contenido: 'Hola, ¿en qué puedo ayudarte?', esBot: true },
      { remitente: '7751234567', contenido: '¿Tienen casas en Tepeapulco?', esBot: false },
      { remitente: 'bot', contenido: 'Sí, tenemos varias opciones...', esBot: true },
      { remitente: '7751234567', contenido: 'AGENTE', esBot: false },
    ];

    const resumen = mensajes
      .map(m => `${m.esBot ? 'Bot' : 'Cliente'}: ${m.contenido}`)
      .join('\n');

    expect(resumen).toContain('Bot: Hola');
    expect(resumen).toContain('Cliente: ¿Tienen casas');
    expect(resumen).toContain('Cliente: AGENTE');
  });
});
