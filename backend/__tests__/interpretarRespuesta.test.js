/**
 * Parser de respuestas libres del flujo de citas por WhatsApp (t330u).
 * Caso real: el bot listó 6 propiedades + "7. Cualquier propiedad" y el cliente respondió "La 6".
 */
import {
  interpretarOpcion, interpretarFecha, interpretarHora, interpretarConfirmacion, extraerNumeroOpcion,
} from '../src/utils/interpretarRespuesta.js';

const PROPIEDADES = [
  ['Departamento en Ciudad Sahagún', 'Emiliano Zapata'],
  ['Departamento amueblado en renta', 'Centro'],
  ['Casa en Ciudad Sahagún con jardín', 'Morelos'],
  ['Local comercial en renta', 'Centro'],
  ['Casa en Tepeapulco Centro', 'Centro'],
  ['Casa amplia en Tepeapulco', 'La Morena'],
].map(([t, c]) => ({ etiqueta: `${t} ${c}` }));
const OPCIONES = [...PROPIEDADES, { etiqueta: 'Cualquier propiedad disponible', alias: ['cualquiera', 'la que sea', 'me da igual'] }];

describe('Elegir propiedad por número', () => {
  test.each([
    '6', 'La 6', 'la 6', '  la 6  ', 'opción 6', 'opcion 6', 'la seis', 'el número 6', 'el numero 6', '6.', '6)',
    'quiero la 6', 'Quiero la 6 por favor', 'la sexta', '#6', '6ta', 'me interesa la 6', 'La 6 ', 'LA SEIS',
  ])('"%s" → opción 6', (msg) => {
    expect(interpretarOpcion(msg, OPCIONES)).toEqual(expect.objectContaining({ indice: 5 }));
  });

  test('"la última" → opción 7 (cualquier propiedad)', () => {
    expect(interpretarOpcion('la última', OPCIONES).indice).toBe(6);
  });

  test('"la primera" y "la uno" → opción 1', () => {
    expect(interpretarOpcion('la primera', OPCIONES).indice).toBe(0);
    expect(interpretarOpcion('la uno', OPCIONES).indice).toBe(0);
  });

  test('número fuera de rango se reporta, no se adivina', () => {
    expect(interpretarOpcion('la 9', OPCIONES)).toEqual({ fueraDeRango: 9 });
  });

  test('"quiero una cita" no se confunde con la opción 1', () => {
    expect(interpretarOpcion('quiero una cita', OPCIONES)).toBeNull();
  });

  test('cantidades no son opciones: "la de 3 recámaras"', () => {
    expect(extraerNumeroOpcion('la de 3 recamaras', 7)).toBeNull();
  });
});

describe('Elegir propiedad por nombre', () => {
  test.each([
    ['la casa amplia', 5],
    ['Tepeapulco La Morena', 5],
    ['la de la morena', 5],
    ['el local', 3],
    ['el local comercial', 3],
    ['la de jardín', 2],
    ['Casa en Tepeapulco Centro', 4],
    ['amueblado', 1],
    ['cualquiera', 6],
    ['me da igual', 6],
  ])('"%s" → opción %i', (msg, idx) => {
    expect(interpretarOpcion(msg, OPCIONES)).toEqual(expect.objectContaining({ indice: idx }));
  });

  test('ambiguo ("departamento") devuelve candidatos para preguntar', () => {
    expect(interpretarOpcion('departamento', OPCIONES)).toEqual({ candidatos: [0, 1] });
  });

  test('sin relación ("hola") → null', () => {
    expect(interpretarOpcion('hola', OPCIONES)).toBeNull();
  });
});

describe('Elegir día', () => {
  // Martes 24 de noviembre de 2026; días ofrecidos: mié 25, jue 26, vie 27, sáb 28, lun 30, mar 1 dic
  const hoy = new Date(2026, 10, 24);
  const fechas = [25, 26, 27, 28, 30].map((d) => new Date(2026, 10, d)).concat([new Date(2026, 11, 1)]);

  test.each([
    ['mañana', 0],
    ['Mañana', 0],
    ['pasado mañana', 1],
    ['el viernes', 2],
    ['viernes', 2],
    ['el próximo lunes', 4],
    ['el 26', 1],
    ['el día 26', 1],
    ['26', 1],
    ['26 de noviembre', 1],
    ['1 de diciembre', 5],
    ['2', 1],
    ['la 2', 1],
    ['opción 3', 2],
    ['la tercera', 2],
  ])('"%s" → día %i', (msg, idx) => {
    expect(interpretarFecha(msg, fechas, hoy)).toEqual(expect.objectContaining({ indice: idx }));
  });

  test('día sin horarios ("el domingo") se reporta como no disponible', () => {
    expect(interpretarFecha('el domingo', fechas, hoy)).toEqual(expect.objectContaining({ noDisponible: true }));
  });

  test('"hoy" sin lugar → no disponible', () => {
    expect(interpretarFecha('hoy', fechas, hoy)).toEqual(expect.objectContaining({ noDisponible: true }));
  });

  test('texto sin fecha → null', () => {
    expect(interpretarFecha('no sé', fechas, hoy)).toBeNull();
  });
});

describe('Elegir hora', () => {
  const horas = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00'];
  test.each([
    ['3', 2],
    ['la 3', 2],
    ['opción 3', 2],
    ['a las 10', 1],
    ['10:00', 1],
    ['10 am', 1],
    ['a las 4', 6],
    ['4 pm', 6],
    ['4 de la tarde', 6],
    ['16', 6],
    ['las once', 2],
    ['temprano', 0],
  ])('"%s" → horario %i', (msg, idx) => {
    expect(interpretarHora(msg, horas)).toEqual(expect.objectContaining({ indice: idx }));
  });

  test('hora no ofrecida ("a las 14") → no disponible', () => {
    expect(interpretarHora('a las 14', horas)).toEqual({ noDisponible: true, hora: '14:00' });
  });
});

describe('Confirmación', () => {
  test.each(['1', 'sí', 'si', 'Sí, confirmo', 'claro', 'ok', 'va', 'perfecto', 'de acuerdo'])('"%s" → sí', (msg) => {
    expect(interpretarConfirmacion(msg)).toBe(true);
  });
  test.each(['0', 'no', 'cancelar', 'mejor no', 'nel'])('"%s" → no', (msg) => {
    expect(interpretarConfirmacion(msg)).toBe(false);
  });
  test('"mmm" → no entendido', () => {
    expect(interpretarConfirmacion('mmm')).toBeNull();
  });
});
