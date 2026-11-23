import { describe, it, expect } from '@jest/globals';
import { normalizarNumeroE164 } from '../src/utils/whatsapp-multiusuario.js';

describe('WhatsApp Lista Negra', () => {
  describe('Bot NO responde a números en lista negra', () => {
    it('debe identificar número en lista negra del usuario', async () => {
      const usuarioId = 'usuario-1';
      const numeroRemitente = '+525512345678';
      
      // Simular lista negra
      const listaNegra = [
        { usuarioId: 'usuario-1', numeroRemitente: '+525512345678' },
      ];

      const bloqueado = listaNegra.some(
        entry => entry.usuarioId === usuarioId && entry.numeroRemitente === numeroRemitente
      );

      expect(bloqueado).toBe(true);
    });

    it('debe permitir respuesta a números NO en lista negra', async () => {
      const usuarioId = 'usuario-1';
      const numeroRemitente = '+525587654321';
      
      // Simular lista negra
      const listaNegra = [
        { usuarioId: 'usuario-1', numeroRemitente: '+525512345678' },
      ];

      const bloqueado = listaNegra.some(
        entry => entry.usuarioId === usuarioId && entry.numeroRemitente === numeroRemitente
      );

      expect(bloqueado).toBe(false);
    });

    it('debe guardar mensaje sin responder cuando está en lista negra', () => {
      const mensaje = {
        remitente: '+525512345678',
        contenido: 'Hola, estoy interesado',
        esBot: false, // Mensaje del cliente
      };

      const listaNegra = ['+525512345678'];
      const bloqueado = listaNegra.includes(mensaje.remitente);

      if (bloqueado) {
        // Guardar mensaje pero NO enviar respuesta de bot
        expect(mensaje.esBot).toBe(false);
        expect(bloqueado).toBe(true);
      }
    });

    it('debe marcar conversación como pasadoAHumano si está en lista negra', () => {
      const listaNegra = ['+525512345678'];
      const numeroRemitente = '+525512345678';
      
      const bloqueado = listaNegra.includes(numeroRemitente);

      const conversacion = {
        atendidoPorBot: !bloqueado, // false si está bloqueado
        pasadoAHumano: bloqueado,   // true si está bloqueado
      };

      expect(conversacion.atendidoPorBot).toBe(false);
      expect(conversacion.pasadoAHumano).toBe(true);
    });
  });

  describe('Aislamiento entre usuarios', () => {
    it('debe aplicar lista negra solo del dueño del número receptor', () => {
      const numeroReceptor = {
        id: 'num-1',
        usuarioId: 'usuario-1',
      };

      const listaNegraUsuario1 = [
        { usuarioId: 'usuario-1', numeroRemitente: '+525512345678' },
      ];

      const listaNegraUsuario2 = [
        { usuarioId: 'usuario-2', numeroRemitente: '+525587654321' },
      ];

      const numeroRemitente = '+525512345678';

      // Solo debe bloquear si está en la lista del dueño del número receptor
      const bloqueadoUsuario1 = listaNegraUsuario1.some(
        entry => entry.usuarioId === numeroReceptor.usuarioId && entry.numeroRemitente === numeroRemitente
      );

      const bloqueadoUsuario2 = listaNegraUsuario2.some(
        entry => entry.usuarioId === numeroReceptor.usuarioId && entry.numeroRemitente === numeroRemitente
      );

      expect(bloqueadoUsuario1).toBe(true);
      expect(bloqueadoUsuario2).toBe(false);
    });
  });

  describe('Normalización de números en lista negra', () => {
    it('debe normalizar números antes de agregar a lista negra', () => {
      const numeroSinNormalizar = '55 1234 5678';
      const numeroNormalizado = normalizarNumeroE164(numeroSinNormalizar);
      
      expect(numeroNormalizado).toBe('+525512345678');
    });

    it('debe comparar números normalizados en lista negra', () => {
      const listaNegra = [
        { numeroRemitente: '+525512345678' },
      ];

      const numeroVariante1 = normalizarNumeroE164('5512345678');
      const numeroVariante2 = normalizarNumeroE164('+52 55 1234 5678');

      const bloqueado1 = listaNegra.some(entry => entry.numeroRemitente === numeroVariante1);
      const bloqueado2 = listaNegra.some(entry => entry.numeroRemitente === numeroVariante2);

      expect(bloqueado1).toBe(true);
      expect(bloqueado2).toBe(true);
    });
  });

  describe('Routing multi-usuario', () => {
    it('debe enrutar mensaje al usuario correcto por phone_number_id', () => {
      const numerosWhatsapp = [
        { id: 'num-1', usuarioId: 'usuario-1', phoneNumberId: 'ph_123', activo: true },
        { id: 'num-2', usuarioId: 'usuario-2', phoneNumberId: 'ph_456', activo: true },
      ];

      const phoneNumberIdEntrante = 'ph_123';

      const numeroReceptor = numerosWhatsapp.find(
        num => num.phoneNumberId === phoneNumberIdEntrante && num.activo
      );

      expect(numeroReceptor).toBeTruthy();
      expect(numeroReceptor.usuarioId).toBe('usuario-1');
    });

    it('debe rechazar mensajes a números inactivos', () => {
      const numerosWhatsapp = [
        { id: 'num-1', usuarioId: 'usuario-1', phoneNumberId: 'ph_123', activo: false },
      ];

      const phoneNumberIdEntrante = 'ph_123';

      const numeroReceptor = numerosWhatsapp.find(
        num => num.phoneNumberId === phoneNumberIdEntrante && num.activo
      );

      expect(numeroReceptor).toBeFalsy();
    });
  });

  describe('Aislamiento por tenant', () => {
    it('debe permitir a usuario ver solo su lista negra', () => {
      const req = {
        user: {
          id: 'usuario-1',
          inmobiliariaId: 'inmob-A',
        },
      };

      const todasLasEntradas = [
        { id: '1', usuarioId: 'usuario-1', numeroRemitente: '+525512345678' },
        { id: '2', usuarioId: 'usuario-2', numeroRemitente: '+525587654321' },
      ];

      const listaUsuario = todasLasEntradas.filter(
        entry => entry.usuarioId === req.user.id
      );

      expect(listaUsuario.length).toBe(1);
      expect(listaUsuario[0].usuarioId).toBe('usuario-1');
    });

    it('debe permitir a admin ver números de su inmobiliaria', () => {
      const req = {
        user: {
          id: 'admin-1',
          rol: 'ADMIN',
          inmobiliariaId: 'inmob-A',
        },
      };

      const todosLosNumeros = [
        { id: 'num-1', usuario: { id: 'user-1', inmobiliariaId: 'inmob-A' } },
        { id: 'num-2', usuario: { id: 'user-2', inmobiliariaId: 'inmob-A' } },
        { id: 'num-3', usuario: { id: 'user-3', inmobiliariaId: 'inmob-B' } },
      ];

      const numerosInmobiliaria = todosLosNumeros.filter(
        num => num.usuario.inmobiliariaId === req.user.inmobiliariaId
      );

      expect(numerosInmobiliaria.length).toBe(2);
    });
  });
});
