import { describe, it, expect } from '@jest/globals';
import { normalizarNumeroE164, enmascarCredenciales } from '../src/utils/whatsapp-multiusuario.js';

describe('WhatsApp Multi-Usuario', () => {
  describe('normalizarNumeroE164', () => {
    it('debe normalizar número de 10 dígitos (México)', () => {
      expect(normalizarNumeroE164('5512345678')).toBe('+525512345678');
    });

    it('debe normalizar número con +52', () => {
      expect(normalizarNumeroE164('+52 55 1234 5678')).toBe('+525512345678');
    });

    it('debe normalizar número con espacios y guiones', () => {
      expect(normalizarNumeroE164('52-55-1234-5678')).toBe('+525512345678');
    });

    it('debe normalizar número sin +', () => {
      expect(normalizarNumeroE164('521234567890')).toBe('+521234567890');
    });

    it('debe normalizar número USA/Canadá', () => {
      expect(normalizarNumeroE164('14155551234')).toBe('+14155551234');
    });

    it('debe rechazar números inválidos', () => {
      expect(normalizarNumeroE164('123')).toBeNull();
      expect(normalizarNumeroE164('abc')).toBeNull();
      expect(normalizarNumeroE164('')).toBeNull();
    });
  });

  describe('enmascarCredenciales', () => {
    it('debe enmascarar accessToken cifrado', () => {
      const numero = {
        id: '123',
        nombre: 'Mi WhatsApp',
        numero: '+525512345678',
        accessToken: 'abc123:def456:encrypted_data_here',
        sessionData: null,
      };

      const resultado = enmascarCredenciales(numero);

      expect(resultado.accessToken).toBe('[ENCRYPTED]');
      expect(resultado.sessionData).toBeNull();
    });

    it('debe enmascarar sessionData cifrada', () => {
      const numero = {
        id: '123',
        nombre: 'Mi WhatsApp',
        numero: '+525512345678',
        accessToken: null,
        sessionData: 'abc123:def456:encrypted_session_data',
      };

      const resultado = enmascarCredenciales(numero);

      expect(resultado.accessToken).toBeNull();
      expect(resultado.sessionData).toBe('[ENCRYPTED]');
    });

    it('debe manejar credenciales nulas', () => {
      const numero = {
        id: '123',
        nombre: 'Mi WhatsApp',
        numero: '+525512345678',
        accessToken: null,
        sessionData: null,
      };

      const resultado = enmascarCredenciales(numero);

      expect(resultado.accessToken).toBeNull();
      expect(resultado.sessionData).toBeNull();
    });
  });
});
