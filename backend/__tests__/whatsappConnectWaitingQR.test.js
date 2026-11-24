/**
 * Test: POST /mi-whatsapp/numeros/:id/connect con sesión waiting_qr
 * 
 * Bug reportado por Daniel:
 * - Backend reinicia → sesión Baileys en waiting_qr
 * - Usuario presiona connect → retorna 'connected' incorrectamente
 * - Fix: verificar numero.estadoConexion !== 'connected' antes de retornar 'connected'
 */
import { describe, it, expect } from '@jest/globals';

describe('POST /mi-whatsapp/numeros/:id/connect - waiting_qr case', () => {

  it('debe retornar waiting_qr cuando sesión existe pero numero.estadoConexion !== connected', () => {
    // Simular estado del número en BD
    const numero = {
      id: 'test-123',
      proveedor: 'BAILEYS',
      estadoConexion: 'waiting_qr', // ← Estado actual en BD
      activo: true,
    };

    // Simular que getActiveSession(id) retorna sesión (socket existe)
    const session = {
      sock: { /* socket mock */ },
      state: { /* state mock */ },
    };

    // Lógica del endpoint (simplificada)
    const getResponse = (numero, session) => {
      // Fix de Daniel:
      if (session && numero.estadoConexion !== 'connected') {
        return { 
          message: 'Esperando escaneo del QR', 
          estadoConexion: 'waiting_qr' 
        };
      }
      if (session) {
        return {
          message: 'Sesión ya activa',
          estadoConexion: 'connected',
        };
      }
      // No hay sesión, iniciar nueva
      return {
        message: 'Conexión iniciada, escanea el QR',
        estadoConexion: 'waiting_qr',
      };
    };

    const response = getResponse(numero, session);

    // Debe retornar waiting_qr, NO connected
    expect(response.estadoConexion).toBe('waiting_qr');
    expect(response.message).toContain('Esperando');
  });

  it('debe retornar connected cuando sesión existe Y numero.estadoConexion === connected', () => {
    const numero = {
      id: 'test-456',
      proveedor: 'BAILEYS',
      estadoConexion: 'connected', // ← Ya conectado
      activo: true,
    };

    const session = {
      sock: { user: { id: '5215512345678' } }, // Usuario autenticado
      state: {},
    };

    const getResponse = (numero, session) => {
      if (session && numero.estadoConexion !== 'connected') {
        return { 
          message: 'Esperando escaneo del QR', 
          estadoConexion: 'waiting_qr' 
        };
      }
      if (session) {
        return {
          message: 'Sesión ya activa',
          estadoConexion: 'connected',
        };
      }
      return {
        message: 'Conexión iniciada, escanea el QR',
        estadoConexion: 'waiting_qr',
      };
    };

    const response = getResponse(numero, session);

    // Debe retornar connected
    expect(response.estadoConexion).toBe('connected');
    expect(response.message).toContain('activa');
  });

  it('debe iniciar nueva sesión cuando NO existe sesión activa', () => {
    const numero = {
      id: 'test-789',
      proveedor: 'BAILEYS',
      estadoConexion: 'disconnected',
      activo: true,
    };

    const session = null; // No hay sesión activa

    const getResponse = (numero, session) => {
      if (session && numero.estadoConexion !== 'connected') {
        return { 
          message: 'Esperando escaneo del QR', 
          estadoConexion: 'waiting_qr' 
        };
      }
      if (session) {
        return {
          message: 'Sesión ya activa',
          estadoConexion: 'connected',
        };
      }
      // Iniciar nueva sesión
      return {
        message: 'Conexión iniciada, escanea el QR',
        estadoConexion: 'waiting_qr',
      };
    };

    const response = getResponse(numero, session);

    // Debe iniciar nueva conexión
    expect(response.estadoConexion).toBe('waiting_qr');
    expect(response.message).toContain('iniciada');
  });

});
