/**
 * Links de propiedades que manda el bot por WhatsApp (t328u).
 * Antes salía https://inmueblecheck.com/propiedad/:id (dominio ajeno, ruta inexistente).
 * Ahora: <FRONTEND_URL|PUBLIC_URL>/i/:slug/propiedades/:id (ficha pública sin sesión).
 */
import { jest } from '@jest/globals';

// ia.service importa whatsappBot.service (que arranca el servidor); se sustituye por un stub.
jest.unstable_mockModule('../src/services/whatsappBot.service.js', () => ({
  actualizarProspecto: jest.fn(),
}));

const { construirUrlPropiedad, obtenerBaseUrlPublica } = await import('../src/utils/publicUrl.js');
const { formatearListaPropiedades, formatearDetallePropiedad, generarRespuestaIA } = await import(
  '../src/services/ia.service.js'
);

const ID = 'ab2002e6-5a8a-4c31-a98e-d5b2c8bc5402';
const inmobiliaria = { nombre: 'Casas Hidalgo', slug: 'casas-hidalgo' };
const propiedad = {
  id: ID, titulo: 'Casa en Tepeapulco', tipo: 'VENTA', precio: 1850000,
  colonia: 'Centro', ciudad: 'Tepeapulco', recamaras: 3, banos: 2,
};

describe('Link público de propiedad', () => {
  const envOriginal = { ...process.env };
  afterEach(() => { process.env = { ...envOriginal }; });

  test('usa FRONTEND_URL y la ruta pública con slug', () => {
    delete process.env.PUBLIC_URL;
    process.env.FRONTEND_URL = 'https://inmueblecheck.danysolutions.online/';
    expect(construirUrlPropiedad(ID, inmobiliaria)).toBe(
      `https://inmueblecheck.danysolutions.online/i/casas-hidalgo/propiedades/${ID}`
    );
  });

  test('PUBLIC_URL tiene prioridad sobre FRONTEND_URL', () => {
    process.env.PUBLIC_URL = 'https://mi-dominio.mx';
    process.env.FRONTEND_URL = 'https://otro.mx';
    expect(obtenerBaseUrlPublica()).toBe('https://mi-dominio.mx');
  });

  test('sin slug usa /propiedades/:id (el frontend redirige)', () => {
    delete process.env.PUBLIC_URL;
    process.env.FRONTEND_URL = 'https://inmueblecheck.danysolutions.online';
    expect(construirUrlPropiedad(ID, null)).toBe(`https://inmueblecheck.danysolutions.online/propiedades/${ID}`);
  });

  test('lista y detalle del bot ya no contienen inmueblecheck.com', () => {
    delete process.env.PUBLIC_URL;
    process.env.FRONTEND_URL = 'https://inmueblecheck.danysolutions.online';
    const esperado = `https://inmueblecheck.danysolutions.online/i/casas-hidalgo/propiedades/${ID}`;
    for (const texto of [
      formatearListaPropiedades([propiedad], inmobiliaria),
      formatearDetallePropiedad(propiedad, inmobiliaria),
    ]) {
      expect(texto).toContain(esperado);
      expect(texto).not.toMatch(/inmueblecheck\.com/);
    }
  });

  test('respuesta real del bot a "ver propiedades" lleva el link correcto', async () => {
    delete process.env.PUBLIC_URL;
    process.env.FRONTEND_URL = 'https://inmueblecheck.danysolutions.online';
    process.env.AI_PROVIDER = 'simulado';
    const r = await generarRespuestaIA('quiero ver propiedades disponibles', {
      inmobiliaria,
      prospecto: { id: 'p1', nombre: 'Ana' },
      ultimaPreguntaBot: null,
      propiedadesDisponibles: [propiedad],
      mensajesPrevios: [],
    });
    expect(r).toContain(`/i/casas-hidalgo/propiedades/${ID}`);
    expect(r).not.toMatch(/inmueblecheck\.com/);
  });
});
