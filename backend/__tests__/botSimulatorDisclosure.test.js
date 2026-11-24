import { describe, it, expect } from '@jest/globals';
import { generarMensajeBienvenida } from '../src/utils/botMessages.js';

describe('Bot Simulator - Divulgación de IA (Requisito Legal LFPDPPP)', () => {
  describe('generarMensajeBienvenida - Función compartida', () => {
    it('debe incluir divulgación de que es un sistema de IA', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo', 'Juan');
      
      expect(mensaje).toContain('asistente automatizado');
      expect(mensaje).toContain('impulsado por IA');
    });

    it('debe incluir saludo personalizado con nombre del prospecto', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo', 'Daniel Ortega');
      
      expect(mensaje).toContain('¡Hola Daniel Ortega!');
      expect(mensaje).toContain('Bienvenido');
    });

    it('debe incluir menú de opciones completo', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo', 'Juan');
      
      expect(mensaje).toContain('Puedo mostrarte:');
      expect(mensaje).toContain('Propiedades disponibles');
      expect(mensaje).toContain('Información de precios');
      expect(mensaje).toContain('Opciones de financiamiento');
      expect(mensaje).toContain('Agendar una visita');
    });

    it('debe incluir comando AGENTE para escalamiento humano', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo', 'Juan');
      
      expect(mensaje).toContain('AGENTE');
      expect(mensaje).toMatch(/hablar con una persona/i);
    });

    it('debe incluir comando BAJA para opt-out (derecho ARCO)', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo', 'Juan');
      
      expect(mensaje).toContain('BAJA');
      expect(mensaje).toMatch(/no recibir más mensajes/i);
    });

    it('debe incluir el nombre de la inmobiliaria', () => {
      const nombreInmobiliaria = 'Propiedades del Norte';
      const mensaje = generarMensajeBienvenida(nombreInmobiliaria, 'Juan');
      
      expect(mensaje).toContain(nombreInmobiliaria);
    });

    it('debe ser UN SOLO mensaje completo (no dos mensajes separados)', () => {
      const mensaje = generarMensajeBienvenida('Casas Hidalgo', 'Daniel Ortega');
      
      // Debe contener TODO en un mensaje:
      expect(mensaje).toContain('¡Hola Daniel Ortega!'); // Saludo personalizado
      expect(mensaje).toContain('asistente automatizado'); // Disclosure
      expect(mensaje).toContain('Puedo mostrarte:'); // Menú
      expect(mensaje).toContain('AGENTE'); // Hints
      expect(mensaje).toContain('BAJA');
    });
  });

  describe('Lógica de respuestas en primera interacción', () => {
    it('en primera interacción debe retornar solo bienvenida completa (no duplicar)', () => {
      const esPrimeraInteraccion = true;
      const nombreInmobiliaria = 'Casas Hidalgo';
      const nombreProspecto = 'Juan Pérez';

      const respuestas = esPrimeraInteraccion
        ? [generarMensajeBienvenida(nombreInmobiliaria, nombreProspecto)]
        : ['Respuesta bot'];

      // Solo UN mensaje en primer contacto (completo)
      expect(respuestas).toHaveLength(1);
      expect(respuestas[0]).toContain('¡Hola Juan Pérez!');
      expect(respuestas[0]).toContain('asistente automatizado');
      expect(respuestas[0]).toContain('Puedo mostrarte:');
      expect(respuestas[0]).toContain('AGENTE');
      expect(respuestas[0]).toContain('BAJA');
    });

    it('en interacciones subsecuentes solo retorna la respuesta del bot', () => {
      const esPrimeraInteraccion = false;
      const respuestaBot = '¿Te gustaría ver alguna en específico?';

      const respuestas = esPrimeraInteraccion
        ? [generarMensajeBienvenida('Casas Hidalgo', 'Juan')]
        : [respuestaBot];

      expect(respuestas).toHaveLength(1);
      expect(respuestas[0]).toBe(respuestaBot);
      // NO debe contener disclosure en mensajes posteriores
      expect(respuestas[0]).not.toContain('asistente automatizado');
    });
  });
});
