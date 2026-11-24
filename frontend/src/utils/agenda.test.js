import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filasDelDia, integrarHorasDeCitas, columnasDeAgenda, columnaDeCita, citasVisibles,
  conteoPorDia, yaPaso, enlaceWhatsApp, diaSemanaISO, SIN_ASESOR,
} from './agenda.js';

const lunes = { activo: true, horaInicio: '09:00', horaFin: '18:00', pausaInicio: '14:00', pausaFin: '15:00' };

test('genera slots con la duración y una sola fila de comida', () => {
  const { cerrado, filas } = filasDelDia({ horario: lunes, duracionMin: 60 });
  assert.equal(cerrado, false);
  assert.deepEqual(filas.map((f) => `${f.tipo}:${f.hora}`), [
    'slot:09:00', 'slot:10:00', 'slot:11:00', 'slot:12:00', 'slot:13:00', 'pausa:14:00',
    'slot:15:00', 'slot:16:00', 'slot:17:00',
  ]);
});

test('respeta duración de 30 min y que el último slot quepa completo', () => {
  const { filas } = filasDelDia({ horario: { activo: true, horaInicio: '09:00', horaFin: '10:45' }, duracionMin: 30 });
  assert.deepEqual(filas.map((f) => f.hora), ['09:00', '09:30', '10:00']);
});

test('día inactivo o cierre de día completo = Cerrado', () => {
  assert.equal(filasDelDia({ horario: { ...lunes, activo: false } }).cerrado, true);
  assert.equal(filasDelDia({ horario: null }).cerrado, true);
  const r = filasDelDia({ horario: lunes, cierres: [{ diaCompleto: true, motivo: 'Día festivo' }] });
  assert.equal(r.cerrado, true);
  assert.equal(r.motivo, 'Día festivo');
});

test('cierre parcial marca las filas que toca', () => {
  const { filas } = filasDelDia({
    horario: lunes, duracionMin: 60,
    cierres: [{ diaCompleto: false, horaInicio: '10:00', horaFin: '12:00', motivo: 'Junta' }],
  });
  assert.deepEqual(filas.filter((f) => f.tipo === 'cierre').map((f) => f.hora), ['10:00', '11:00']);
});

test('citas fuera de la rejilla agregan su propia fila ordenada', () => {
  const { filas } = filasDelDia({ horario: lunes, duracionMin: 60 });
  const r = integrarHorasDeCitas(filas, [{ hora: '10:30' }, { hora: '10:00' }]);
  const i = r.findIndex((f) => f.hora === '10:30');
  assert.equal(r[i].tipo, 'extra');
  assert.equal(r[i - 1].hora, '10:00');
  assert.equal(r[i + 1].hora, '11:00');
});

test('columnas por asesor y "Sin asignar" solo si hace falta', () => {
  const asesores = [{ id: 'a1', nombre: 'Ana' }, { id: 'a2', nombre: 'Beto' }];
  assert.equal(columnasDeAgenda(asesores, [{ asesorId: 'a1' }]).length, 2);
  const cols = columnasDeAgenda(asesores, [{ asesorId: null }]);
  assert.equal(cols.at(-1).id, SIN_ASESOR);
  assert.equal(columnaDeCita({ asesor: { id: 'a2' } }, asesores), 'a2');
  assert.equal(columnaDeCita({ asesorId: 'zzz' }, asesores), SIN_ASESOR);
});

test('canceladas ocultas por defecto y fuera del conteo', () => {
  const citas = [
    { estado: 'PENDIENTE', fecha: '2026-11-25T00:00:00.000Z' },
    { estado: 'CANCELADA', fecha: '2026-11-25T00:00:00.000Z' },
    { estado: 'CONFIRMADA', fecha: '2026-11-26T06:00:00.000Z' },
  ];
  assert.equal(citasVisibles(citas).length, 2);
  assert.equal(citasVisibles(citas, { incluirCanceladas: true }).length, 3);
  assert.deepEqual(conteoPorDia(citas), { '2026-11-25': 1, '2026-11-26': 1 });
});

test('yaPaso compara en hora local', () => {
  const ahora = new Date(2026, 10, 24, 12, 0);
  assert.equal(yaPaso('2026-11-24', '11:00', ahora), true);
  assert.equal(yaPaso('2026-11-24', '13:00', ahora), false);
  assert.equal(yaPaso('2026-11-25', '09:00', ahora), false);
});

test('enlace de WhatsApp agrega lada de México a 10 dígitos', () => {
  assert.equal(enlaceWhatsApp('55 1234 5678'), 'https://wa.me/525512345678');
  assert.equal(enlaceWhatsApp('+5215512345678'), 'https://wa.me/5215512345678');
  assert.equal(enlaceWhatsApp(''), null);
});

test('diaSemanaISO: domingo = 7', () => {
  assert.equal(diaSemanaISO(new Date(2026, 10, 29)), 7);
  assert.equal(diaSemanaISO(new Date(2026, 10, 23)), 1);
});

test('una cita en horario de comida o cierre no se esconde', () => {
  const { filas } = filasDelDia({
    horario: lunes, duracionMin: 60,
    cierres: [{ diaCompleto: false, horaInicio: '10:00', horaFin: '11:00', motivo: 'Junta' }],
  });
  const r = integrarHorasDeCitas(filas, [{ hora: '10:00' }, { hora: '14:00' }]);
  assert.deepEqual(r.filter((f) => f.tipo === 'extra').map((f) => f.hora), ['10:00', '14:00']);
});
