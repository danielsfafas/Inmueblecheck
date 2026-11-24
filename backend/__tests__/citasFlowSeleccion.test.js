/**
 * Flujo de citas por WhatsApp de punta a punta con BD simulada (t329u / t330u).
 * Reproduce la conversación de Daniel: "Agendar una cita" → lista de 6 + "Cualquier propiedad" → "La 6".
 */
import { jest } from '@jest/globals';

const PROPS = [
  ['p1', 'Departamento en Ciudad Sahagún', 'Emiliano Zapata'],
  ['p2', 'Departamento amueblado en renta', 'Centro'],
  ['p3', 'Casa en Ciudad Sahagún con jardín', 'Morelos'],
  ['p4', 'Local comercial en renta', 'Centro'],
  ['p5', 'Casa en Tepeapulco Centro', 'Centro'],
  ['p6', 'Casa amplia en Tepeapulco', 'La Morena'],
].map(([id, titulo, colonia]) => ({ id, titulo, colonia, recamaras: 3, banos: 2, precio: 1000000 }));

// Mié 25, jue 26 y vie 27 de noviembre de 2026
const DIAS = [25, 26, 27].map((d) => ({ fecha: new Date(2026, 10, d), slotsDisponibles: 4 }));

let conversacion;
const citasCreadas = [];

const prisma = {
  conversacion: {
    update: jest.fn(async ({ data }) => {
      if ('flujoBot' in data) conversacion.flujoBot = data.flujoBot;
      if ('flujoEstado' in data) conversacion.flujoEstado = data.flujoEstado ? JSON.parse(JSON.stringify(data.flujoEstado)) : null;
      return conversacion;
    }),
  },
  interes: { findFirst: jest.fn(async () => null) },
  propiedad: { findMany: jest.fn(async () => PROPS) },
  prospecto: {
    findUnique: jest.fn(async () => ({ id: 'pr1', nombre: 'Daniel', telefono: '+527711234567', etapa: 'NUEVO', ejecutivoId: null })),
    update: jest.fn(async () => ({})),
  },
  inmobiliaria: { findUnique: jest.fn(async () => ({ duracionCitaMin: 60 })) },
  cita: {
    create: jest.fn(async ({ data }) => {
      const prop = PROPS.find((p) => p.id === data.propiedadId) || null;
      const cita = { id: `c${citasCreadas.length + 1}`, ...data, propiedad: prop, asesor: { id: 'a1', nombre: 'María', telefonoWhatsapp: null } };
      citasCreadas.push(cita);
      return cita;
    }),
  },
  actividad: { create: jest.fn(async () => ({})) },
};

jest.unstable_mockModule('../src/index.js', () => ({ prisma, io: { to: () => ({ emit() {} }), emit() {} } }));
jest.unstable_mockModule('../src/services/citas.service.js', () => ({
  obtenerDiasConDisponibilidad: jest.fn(async () => DIAS),
  obtenerSlotsDisponibles: jest.fn(async () => ({
    slots: ['09:00', '10:00', '11:00', '16:00'].map((hora) => ({ hora, disponible: true })),
  })),
  validarSlotDisponible: jest.fn(async () => ({ valido: true })),
  asignarAsesorLibre: jest.fn(async () => ({ id: 'a1', nombre: 'María' })),
}));
jest.unstable_mockModule('../src/services/notificaciones.service.js', () => ({
  crearNotificacion: jest.fn(async () => ({})),
  notificarAsesorPorWhatsApp: jest.fn(async () => null),
}));
const elegirOpcionConIA = jest.fn(async () => null);
jest.unstable_mockModule('../src/services/iaSeleccion.service.js', () => ({
  elegirOpcionConIA,
  iaDisponible: () => false,
}));

const { iniciarFlujoCita, procesarFlujoCita } = await import('../src/services/citasFlow.service.js');

const contexto = { inmobiliaria: { id: 'inm1', nombre: 'Casas Hidalgo', slug: 'casas-hidalgo' } };

function nuevaConversacion() {
  conversacion = { id: 'conv1', prospectoId: 'pr1', numeroWhatsappId: null, flujoBot: null, flujoEstado: null };
}

async function responder(texto) {
  return procesarFlujoCita({ ...conversacion }, texto, contexto);
}

beforeAll(() => {
  process.env.FRONTEND_URL = 'https://inmueblecheck.danysolutions.online';
  // Fijar "hoy" al martes 24 nov 2026 para "mañana" / "el viernes"
  jest.useFakeTimers({ now: new Date('2026-11-24T16:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  nuevaConversacion();
  citasCreadas.length = 0;
  elegirOpcionConIA.mockReset();
  elegirOpcionConIA.mockResolvedValue(null);
});

describe('Agendar por WhatsApp', () => {
  test('caso de Daniel: "La 6" elige "Casa amplia en Tepeapulco" y la cita se crea con origen WHATSAPP', async () => {
    const lista = await iniciarFlujoCita({ ...conversacion }, contexto);
    expect(lista).toContain('*6.* Casa amplia en Tepeapulco');
    expect(lista).toContain('*7.* Cualquier propiedad disponible');
    expect(conversacion.flujoBot).toBe('booking');

    const dias = await responder('La 6');
    expect(dias).toContain('¿Qué día te gustaría agendar la visita?');
    expect(dias).toContain('Propiedad: Casa amplia en Tepeapulco');
    expect(conversacion.flujoEstado.propiedadId).toBe('p6');

    const horas = await responder('el viernes');
    expect(horas).toContain('¿A qué hora?');
    expect(horas.toLowerCase()).toContain('viernes 27 de noviembre');

    const resumen = await responder('a las 10');
    expect(resumen).toContain('Resumen de tu cita');
    expect(resumen).toContain('https://inmueblecheck.danysolutions.online/i/casas-hidalgo/propiedades/p6');
    expect(resumen).toContain('a las 10:00');

    const ok = await responder('sí');
    expect(ok).toContain('¡Cita agendada!');
    expect(ok).toContain('/i/casas-hidalgo/propiedades/p6');
    expect(citasCreadas).toHaveLength(1);
    expect(citasCreadas[0]).toEqual(expect.objectContaining({
      propiedadId: 'p6', hora: '10:00', origen: 'WHATSAPP', estado: 'PENDIENTE', prospectoId: 'pr1',
    }));
    expect(citasCreadas[0].fecha.getDate()).toBe(27);
    expect(conversacion.flujoBot).toBeNull();
  });

  test.each(['6', 'la seis', 'opción 6', 'el número 6', '6.', 'quiero la 6', 'la casa amplia', 'Tepeapulco La Morena'])(
    'paso 1 entiende "%s"',
    async (msg) => {
      await iniciarFlujoCita({ ...conversacion }, contexto);
      await responder(msg);
      expect(conversacion.flujoEstado.paso).toBe(2);
      expect(conversacion.flujoEstado.propiedadId).toBe('p6');
    },
  );

  test('si no entiende, repite la pregunta amablemente y no sale del flujo', async () => {
    await iniciarFlujoCita({ ...conversacion }, contexto);
    const r = await responder('mmm no sé');
    expect(r).toContain('no logré entender');
    expect(r).toContain('¿Qué propiedad te gustaría visitar?');
    expect(conversacion.flujoBot).toBe('booking');
    expect(conversacion.flujoEstado.paso).toBe(1);
  });

  test('ambigüedad: pregunta entre los candidatos', async () => {
    await iniciarFlujoCita({ ...conversacion }, contexto);
    const r = await responder('el departamento');
    expect(r).toContain('¿Cuál de estas?');
    expect(r).toContain('*1.* Departamento en Ciudad Sahagún');
    expect(r).toContain('*2.* Departamento amueblado en renta');
    expect(conversacion.flujoEstado.paso).toBe(1);
  });

  test('ambigüedad con IA configurada: la IA elige entre los candidatos', async () => {
    elegirOpcionConIA.mockResolvedValue(1); // segundo candidato
    await iniciarFlujoCita({ ...conversacion }, contexto);
    await responder('el departamento');
    expect(elegirOpcionConIA).toHaveBeenCalledWith(
      'el departamento',
      ['Departamento en Ciudad Sahagún Emiliano Zapata', 'Departamento amueblado en renta Centro'],
      expect.any(String),
    );
    expect(conversacion.flujoEstado.paso).toBe(2);
    expect(conversacion.flujoEstado.propiedadId).toBe('p2');
  });

  test('días: "mañana" y "el 26"', async () => {
    await iniciarFlujoCita({ ...conversacion }, contexto);
    await responder('la 6');
    await responder('mañana');
    expect(new Date(conversacion.flujoEstado.fechaSeleccionada).getDate()).toBe(25);

    nuevaConversacion();
    await iniciarFlujoCita({ ...conversacion }, contexto);
    await responder('la 6');
    await responder('el 26');
    expect(new Date(conversacion.flujoEstado.fechaSeleccionada).getDate()).toBe(26);
  });

  test('día sin horarios: lo dice y vuelve a mostrar los días', async () => {
    await iniciarFlujoCita({ ...conversacion }, contexto);
    await responder('la 6');
    const r = await responder('el domingo');
    expect(r).toContain('no tengo horarios disponibles');
    expect(r).toContain('Días disponibles');
    expect(conversacion.flujoEstado.paso).toBe(2);
  });

  test('hora no entendida: repite los horarios', async () => {
    await iniciarFlujoCita({ ...conversacion }, contexto);
    await responder('la 6');
    await responder('la 1');
    const r = await responder('cuando sea');
    expect(r).toContain('Horarios disponibles');
    expect(conversacion.flujoEstado.paso).toBe(3);
  });

  test('confirmación no entendida: vuelve a preguntar; "no" cancela sin crear cita', async () => {
    await iniciarFlujoCita({ ...conversacion }, contexto);
    await responder('la 6');
    await responder('la 1');
    await responder('la 1');
    const r = await responder('mmm');
    expect(r).toContain('¿Confirmas la cita?');
    const no = await responder('no');
    expect(no).toContain('Cita cancelada');
    expect(citasCreadas).toHaveLength(0);
  });

  test('"Cualquier propiedad" (opción 7) crea la cita sin propiedad', async () => {
    await iniciarFlujoCita({ ...conversacion }, contexto);
    await responder('la 7');
    expect(conversacion.flujoEstado.propiedadId).toBeNull();
    await responder('1');
    await responder('2');
    await responder('1');
    expect(citasCreadas[0]).toEqual(expect.objectContaining({ propiedadId: null, origen: 'WHATSAPP' }));
  });

  test('con propiedad de interés previa salta directo a elegir día', async () => {
    prisma.interes.findFirst.mockResolvedValueOnce({ propiedadId: 'p5', propiedad: PROPS[4] });
    const r = await iniciarFlujoCita({ ...conversacion }, contexto);
    expect(r).toContain('¿Qué día te gustaría agendar la visita?');
    expect(r).toContain('Casa en Tepeapulco Centro');
    expect(conversacion.flujoEstado.paso).toBe(2);
  });
});
