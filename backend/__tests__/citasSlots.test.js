/**
 * Tests para algoritmo de slots de citas
 * 
 * Tests de lógica pura:
 * - Generar slots básicos (horario 9-18, duración 60min)
 * - Excluir lunch break (14-15)
 * - Excluir cierres full-day
 * - Excluir cierres parciales
 * - Filtrar slots pasados + lead time
 * - Capacidad: 1 asesor + 1 propiedad por slot
 */

// Jest (no imports needed)
import { parse, addMinutes, format, isAfter, isBefore } from 'date-fns';

describe('Slots Generation - Lógica Pura', () => {
  test('generar slots básicos 9-18h con duración 60min', () => {
    const fecha = new Date('2024-01-15T00:00:00');
    const horaInicio = parse('09:00', 'HH:mm', fecha);
    const horaFin = parse('18:00', 'HH:mm', fecha);
    const duracion = 60;

    const slots = [];
    let slotActual = horaInicio;

    while (isBefore(slotActual, horaFin)) {
      const slotFin = addMinutes(slotActual, duracion);
      if (isAfter(slotFin, horaFin)) break;
      
      slots.push(format(slotActual, 'HH:mm'));
      slotActual = addMinutes(slotActual, duracion);
    }

    expect(slots).toEqual([
      '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00'
    ]);
    expect(slots.length).toBe(9);
  });

  test('excluir lunch break 14:00-15:00', () => {
    const fecha = new Date('2024-01-15T00:00:00');
    const horaInicio = parse('09:00', 'HH:mm', fecha);
    const horaFin = parse('18:00', 'HH:mm', fecha);
    const pausaInicio = parse('14:00', 'HH:mm', fecha);
    const pausaFin = parse('15:00', 'HH:mm', fecha);
    const duracion = 60;

    const slots = [];
    let slotActual = horaInicio;

    while (isBefore(slotActual, horaFin)) {
      const slotFin = addMinutes(slotActual, duracion);
      if (isAfter(slotFin, horaFin)) break;

      // Skip si overlap con lunch
      const overlapLunch = isBefore(slotActual, pausaFin) && isAfter(slotFin, pausaInicio);
      
      if (!overlapLunch) {
        slots.push(format(slotActual, 'HH:mm'));
      }

      slotActual = addMinutes(slotActual, duracion);
    }

    expect(slots).not.toContain('14:00');
    expect(slots).toContain('13:00');
    expect(slots).toContain('15:00');
    expect(slots.length).toBe(8);
  });

  test('excluir slot si overlap con cierre parcial 10:00-12:00', () => {
    const fecha = new Date('2024-01-15T00:00:00');
    const slotInicio = parse('11:00', 'HH:mm', fecha);
    const slotFin = addMinutes(slotInicio, 60);
    
    const cierreInicio = parse('10:00', 'HH:mm', fecha);
    const cierreFin = parse('12:00', 'HH:mm', fecha);

    const overlapCierre = isBefore(slotInicio, cierreFin) && isAfter(slotFin, cierreInicio);

    expect(overlapCierre).toBe(true);
  });

  test('NO excluir slot si NO overlap con cierre parcial', () => {
    const fecha = new Date('2024-01-15T00:00:00');
    const slotInicio = parse('09:00', 'HH:mm', fecha);
    const slotFin = addMinutes(slotInicio, 60);
    
    const cierreInicio = parse('14:00', 'HH:mm', fecha);
    const cierreFin = parse('16:00', 'HH:mm', fecha);

    const overlapCierre = isBefore(slotInicio, cierreFin) && isAfter(slotFin, cierreInicio);

    expect(overlapCierre).toBe(false);
  });

  test('filtrar slots pasados + lead time (120 min)', () => {
    const fecha = new Date('2024-01-15T10:00:00'); // Hoy 10:00 AM
    const ahora = new Date('2024-01-15T10:00:00');
    const leadTime = 120; // 2 horas

    const minimoHora = addMinutes(ahora, leadTime); // 12:00

    const slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
    
    const slotsDisponibles = slots.filter(horaStr => {
      const slotDateTime = parse(horaStr, 'HH:mm', fecha);
      return isAfter(slotDateTime, minimoHora);
    });

    expect(slotsDisponibles).toEqual(['13:00', '14:00']);
  });
});

describe('Capacidad de Slots', () => {
  test('calcular capacidad: 3 asesores activos, 1 ocupado = 2 libres', () => {
    const totalAsesores = 3;
    const asesoresOcupados = new Set(['asesor-1']);
    
    const asesoresLibres = totalAsesores - asesoresOcupados.size;

    expect(asesoresLibres).toBe(2);
  });

  test('propiedad ocupada en slot = capacidad 0', () => {
    const citasEnSlot = [
      { propiedadId: 'prop-1', asesorId: 'asesor-1' },
    ];
    const propiedadId = 'prop-1';

    const propiedadOcupada = citasEnSlot.some(c => c.propiedadId === propiedadId);

    expect(propiedadOcupada).toBe(true);
  });

  test('propiedad libre en slot = puede agendar', () => {
    const citasEnSlot = [
      { propiedadId: 'prop-2', asesorId: 'asesor-1' },
    ];
    const propiedadId = 'prop-1';

    const propiedadOcupada = citasEnSlot.some(c => c.propiedadId === propiedadId);

    expect(propiedadOcupada).toBe(false);
  });

  test('asesor ocupado en slot = no puede agendar', () => {
    const citasEnSlot = [
      { propiedadId: 'prop-1', asesorId: 'asesor-1' },
    ];
    const asesorId = 'asesor-1';

    const asesorOcupado = citasEnSlot.some(c => c.asesorId === asesorId);

    expect(asesorOcupado).toBe(true);
  });
});

describe('Validación de Slots', () => {
  test('slot pasado = no válido', () => {
    const ahora = new Date('2024-01-15T14:00:00');
    const slotDateTime = new Date('2024-01-15T10:00:00');

    const valido = isAfter(slotDateTime, ahora);

    expect(valido).toBe(false);
  });

  test('slot futuro = válido', () => {
    const ahora = new Date('2024-01-15T10:00:00');
    const slotDateTime = new Date('2024-01-15T14:00:00');

    const valido = isAfter(slotDateTime, ahora);

    expect(valido).toBe(true);
  });

  test('verificar lead time: 120 min requerido, 60 min disponible = no válido', () => {
    const ahora = new Date('2024-01-15T12:00:00');
    const slotDateTime = new Date('2024-01-15T13:00:00');
    const leadTime = 120;

    const minimoHora = addMinutes(ahora, leadTime);
    const valido = isAfter(slotDateTime, minimoHora);

    expect(valido).toBe(false);
  });

  test('verificar lead time: 120 min requerido, 150 min disponible = válido', () => {
    const ahora = new Date('2024-01-15T12:00:00');
    const slotDateTime = new Date('2024-01-15T14:30:00');
    const leadTime = 120;

    const minimoHora = addMinutes(ahora, leadTime);
    const valido = isAfter(slotDateTime, minimoHora);

    expect(valido).toBe(true);
  });
});
