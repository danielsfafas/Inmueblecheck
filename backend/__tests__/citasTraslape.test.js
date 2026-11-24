/**
 * Validación de traslape de citas (admin y WhatsApp usan la misma regla).
 */
import { jest } from '@jest/globals';

const citasDelDia = [];
jest.unstable_mockModule('../src/index.js', () => ({
  prisma: {
    cita: {
      findMany: jest.fn(async ({ where }) => citasDelDia.filter((c) => !where.id || c.id !== where.id.not)),
    },
  },
}));

const { seTraslapan, buscarTraslape } = await import('../src/services/citas.service.js');

describe('seTraslapan', () => {
  test.each([
    ['10:00', 60, '10:00', 60, true],
    ['10:30', 60, '10:00', 60, true],
    ['09:30', 60, '10:00', 60, true],
    ['11:00', 60, '10:00', 60, false],
    ['09:00', 60, '10:00', 60, false],
    ['10:00', 90, '11:00', 60, true],
  ])('%s (%i min) vs %s (%i min) → %s', (a, da, b, db, esperado) => {
    expect(seTraslapan(a, da, b, db)).toBe(esperado);
  });
});

describe('buscarTraslape', () => {
  beforeEach(() => {
    citasDelDia.length = 0;
    citasDelDia.push({ id: 'c1', hora: '10:00', duracionMin: 60, asesorId: 'a1', propiedadId: 'p1' });
  });

  const base = { inmobiliariaId: 'i1', fecha: new Date(2026, 10, 27), duracionMin: 60 };

  test('mismo asesor encimado → conflicto de asesor', async () => {
    expect((await buscarTraslape({ ...base, hora: '10:30', asesorId: 'a1' }))?.tipo).toBe('asesor');
  });
  test('misma propiedad encimada → conflicto de propiedad', async () => {
    expect((await buscarTraslape({ ...base, hora: '10:00', propiedadId: 'p1', asesorId: 'a2' }))?.tipo).toBe('propiedad');
  });
  test('otro asesor y otra propiedad → sin conflicto', async () => {
    expect(await buscarTraslape({ ...base, hora: '10:00', asesorId: 'a2', propiedadId: 'p2' })).toBeNull();
  });
  test('al reprogramar se excluye la propia cita', async () => {
    expect(await buscarTraslape({ ...base, hora: '10:00', asesorId: 'a1', excluirCitaId: 'c1' })).toBeNull();
  });
});
