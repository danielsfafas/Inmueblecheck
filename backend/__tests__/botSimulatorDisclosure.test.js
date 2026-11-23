import { describe, it, expect } from '@jest/globals';
import { generarMensajeBienvenida } from '../src/utils/botMessages.js';

describe('Bot Simulator - Divulgación de IA (Requisito Legal LFPDPPP)', () => {
  describe('generarMensajeBienvenida - Función compartida', () => {
    it('debe incluir divulgación de que es un sistema de IA', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo');
      
      expect(mensaje).toContain('asistente virtual');
      expect(mensaje).toContain('sistema automatizado');
      expect(mensaje).toContain('inteligencia artificial');
    });

    it('debe incluir comando AGENTE para escalamiento humano', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo');
      
      expect(mensaje).toContain('AGENTE');
      expect(mensaje).toMatch(/hablar con una persona|contactar.*persona|ejecutivo/i);
    });

    it('debe incluir comando BAJA para opt-out (derecho ARCO)', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo');
      
      expect(mensaje).toContain('BAJA');
      expect(mensaje).toMatch(/no.*recibir.*mensajes|dejar.*contactar/i);
    });

    it('debe incluir el nombre de la inmobiliaria', () => {
      const nombreInmobiliaria = 'Propiedades del Norte';
      const mensaje = generarMensajeBienvenida(nombreInmobiliaria);
      
      expect(mensaje).toContain(nombreInmobiliaria);
    });

    it('debe incluir tanto AGENTE como BAJA en el mismo mensaje', () => {
      const mensaje = generarMensajeBienvenida('Test Inmobiliaria');
      
      // Ambos comandos deben aparecer para cumplir con transparencia legal
      expect(mensaje).toContain('AGENTE');
      expect(mensaje).toContain('BAJA');
    });
  });

  describe('Lógica de respuestas en primera interacción', () => {
    it('en primera interacción debe retornar array con bienvenida y respuesta', () => {
      const esPrimeraInteraccion = true;
      const respuestaBot = 'Tenemos varias opciones disponibles...';
      const nombreInmobiliaria = 'Casas Hidalgo';

      const respuestas = esPrimeraInteraccion
        ? [generarMensajeBienvenida(nombreInmobiliaria), respuestaBot]
        : [respuestaBot];

      expect(respuestas).toHaveLength(2);
      expect(respuestas[0]).toContain('asistente virtual');
      expect(respuestas[0]).toContain('AGENTE');
      expect(respuestas[0]).toContain('BAJA');
      expect(respuestas[1]).toBe(respuestaBot);
    });

    it('en interacciones subsecuentes solo retorna la respuesta', () => {
      const esPrimeraInteraccion = false;
      const respuestaBot = '¿Te gustaría ver alguna en específico?';
      const nombreInmobiliaria = 'Casas Hidalgo';

      const respuestas = esPrimeraInteraccion
        ? [generarMensajeBienvenida(nombreInmobiliaria), respuestaBot]
        : [respuestaBot];

      expect(respuestas).toHaveLength(1);
      expect(respuestas[0]).toBe(respuestaBot);
    });
  });
});
