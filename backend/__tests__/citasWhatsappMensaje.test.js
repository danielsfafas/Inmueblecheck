/**
 * Mensaje de confirmación que el panel manda al prospecto (checkbox apagado por defecto).
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/index.js', () => ({ prisma: {} }));
jest.unstable_mockModule('../src/services/baileys.service.js', () => ({ sendBaileysMessage: jest.fn() }));

const { construirMensajeCita } = await import('../src/services/citasWhatsapp.service.js');

describe('construirMensajeCita', () => {
  beforeAll(() => {
    process.env.FRONTEND_URL = 'https://inmueblecheck.danysolutions.online';
  });
  const cita = {
    fecha: new Date(2026, 10, 27),
    hora: '10:00',
    prospecto: { nombre: 'Daniel Ortega' },
    propiedad: { id: 'p6', titulo: 'Casa amplia en Tepeapulco' },
    asesor: { nombre: 'María' },
  };
  const inm = { slug: 'casas-hidalgo' };

  test('CREADA incluye día, hora, propiedad con link público y asesor', () => {
    const m = construirMensajeCita('CREADA', cita, inm);
    expect(m).toContain('Hola Daniel');
    expect(m).toContain('Viernes 27 de noviembre');
    expect(m).toContain('10:00');
    expect(m).toContain('https://inmueblecheck.danysolutions.online/i/casas-hidalgo/propiedades/p6');
    expect(m).toContain('Asesor: María');
  });
  test('CANCELADA incluye el motivo', () => {
    expect(construirMensajeCita('CANCELADA', cita, inm, { motivo: 'Lluvia' })).toContain('Motivo: Lluvia');
  });
  test('tipo desconocido → null', () => {
    expect(construirMensajeCita('OTRO', cita, inm)).toBeNull();
  });
});
