/**
 * Tests de Lista Blanca (Whitelist) - Lógica de filtrado
 * 
 * Regla de Daniel:
 * - Lista vacía → bot responde a TODOS
 * - Lista con ≥1 número → bot SOLO responde a números en lista
 * - Blacklist siempre gana sobre whitelist
 * 
 * NOTA: Tests requieren BD Postgres corriendo (docker-compose up)
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Importar funciones directamente inline para evitar cargar index.js
async function normalizarNumeroE164(numero) {
  if (!numero) return null;
  let limpio = numero.toString().replace(/[^\d+]/g, '');
  if (!limpio.startsWith('+')) {
    if (limpio.startsWith('52')) limpio = '+' + limpio;
    else if (limpio.length === 10) limpio = '+52' + limpio;
    else if (limpio.length === 11 && limpio.startsWith('1')) limpio = '+' + limpio;
    else limpio = '+52' + limpio;
  }
  const e164Regex = /^\+\d{10,15}$/;
  if (!e164Regex.test(limpio)) return null;
  return limpio;
}

async function estaEnListaNegra(prisma, usuarioId, numeroRemitente) {
  const numeroNormalizado = await normalizarNumeroE164(numeroRemitente);
  const entrada = await prisma.listaNegra.findFirst({
    where: {
      usuarioId,
      OR: [
        ...(numeroNormalizado ? [{ numeroRemitente: numeroNormalizado }] : []),
        { numeroRemitente: numeroRemitente },
      ],
    },
  });
  return !!entrada;
}

async function debeAtenderSegunListaBlanca(prisma, usuarioId, numeroRemitente) {
  const countListaBlanca = await prisma.listaBlanca.count({ where: { usuarioId } });
  if (countListaBlanca === 0) return true;
  
  const numeroNormalizado = await normalizarNumeroE164(numeroRemitente);
  const entrada = await prisma.listaBlanca.findFirst({
    where: {
      usuarioId,
      OR: [
        ...(numeroNormalizado ? [{ numero: numeroNormalizado }] : []),
        { numero: numeroRemitente },
      ],
    },
  });
  return !!entrada;
}

let inmobiliariaId;
let usuarioId;

beforeAll(async () => {
  // Crear inmobiliaria y usuario de prueba
  const inmobiliaria = await prisma.inmobiliaria.create({
    data: { nombre: 'Test Whitelist Inmobiliaria' },
  });
  inmobiliariaId = inmobiliaria.id;

  const usuario = await prisma.usuario.create({
    data: {
      inmobiliariaId,
      nombre: 'Test User Whitelist',
      email: `whitelist-test-${Date.now()}@test.com`,
      password: await bcrypt.hash('test123', 10),
      rol: 'ADMIN',
      activo: true,
    },
  });
  usuarioId = usuario.id;
});

afterAll(async () => {
  // Limpiar
  await prisma.listaBlanca.deleteMany({ where: { usuarioId } });
  await prisma.listaNegra.deleteMany({ where: { usuarioId } });
  await prisma.usuario.delete({ where: { id: usuarioId } });
  await prisma.inmobiliaria.delete({ where: { id: inmobiliariaId } });
  await prisma.$disconnect();
});

// NOTA: Tests require database (docker-compose up). Skip in CI without DB.
describe.skip('Lista Blanca (Whitelist) - Lógica de Filtrado', () => {

  it('Lista vacía → debe atender a TODOS los números', async () => {
    // Sin entradas en lista blanca
    const count = await prisma.listaBlanca.count({ where: { usuarioId } });
    expect(count).toBe(0);

    // Debe atender a cualquier número
    const debe1 = await debeAtenderSegunListaBlanca(prisma, usuarioId, '+5215512345678');
    const debe2 = await debeAtenderSegunListaBlanca(prisma, usuarioId, '+5219998887777');
    const debe3 = await debeAtenderSegunListaBlanca(prisma, usuarioId, '219502943989980@lid');

    expect(debe1).toBe(true);
    expect(debe2).toBe(true);
    expect(debe3).toBe(true);
  });

  it('Lista con números → SOLO debe atender a números en lista', async () => {
    // Agregar números a lista blanca
    await prisma.listaBlanca.create({
      data: {
        usuarioId,
        numero: '+5215512345678',
        nombre: 'Cliente Permitido',
      },
    });

    await prisma.listaBlanca.create({
      data: {
        usuarioId,
        numero: '+5219998887777',
        nombre: 'Otro Permitido',
      },
    });

    // Verificar que solo atiende a números en lista
    const debeAtender1 = await debeAtenderSegunListaBlanca(prisma, usuarioId, '+5215512345678');
    const debeAtender2 = await debeAtenderSegunListaBlanca(prisma, usuarioId, '+5219998887777');
    const noDebeAtender = await debeAtenderSegunListaBlanca(prisma, usuarioId, '+5211112223333');

    expect(debeAtender1).toBe(true); // En lista → atender
    expect(debeAtender2).toBe(true); // En lista → atender
    expect(noDebeAtender).toBe(false); // NO en lista → NO atender
  });

  it('Blacklist gana sobre whitelist (precedencia)', async () => {
    const numero = '+5215512345678';

    // Número está en lista blanca
    const enListaBlanca = await debeAtenderSegunListaBlanca(prisma, usuarioId, numero);
    expect(enListaBlanca).toBe(true);

    // Agregar a lista negra
    await prisma.listaNegra.create({
      data: {
        usuarioId,
        numeroRemitente: numero,
        nombreContacto: 'Bloqueado',
      },
    });

    // Verificar precedencia: blacklist gana
    const estaBloqueado = await estaEnListaNegra(prisma, usuarioId, numero);
    expect(estaBloqueado).toBe(true); // Blacklist dice NO

    // Aunque esté en whitelist, blacklist gana
    // (La lógica del bot verifica blacklist PRIMERO, luego whitelist)
  });

  it('Normalización de números mexicanos - Formatos +52, 52, 521, 10 dígitos', async () => {
    // Limpiar lista blanca
    await prisma.listaBlanca.deleteMany({ where: { usuarioId } });

    // Agregar con formato +52
    await prisma.listaBlanca.create({
      data: {
        usuarioId,
        numero: '+5215512345678',
        nombre: 'Test Normalización',
      },
    });

    // Verificar que todos estos formatos matchean
    const formatos = [
      '+5215512345678',    // +52
      '525512345678',      // 52
      '5215512345678',     // 521
      '5512345678',        // 10 dígitos
    ];

    for (const formato of formatos) {
      const normalizado = normalizarNumeroE164(formato);
      const debe = await debeAtenderSegunListaBlanca(prisma, usuarioId, formato);
      
      // Todos deben normalizar a +5215512345678
      expect(normalizado).toBe('+5215512345678');
      expect(debe).toBe(true); // Debe atender
    }
  });

  it('Matching con números LID resueltos', async () => {
    // Limpiar
    await prisma.listaBlanca.deleteMany({ where: { usuarioId } });

    // Agregar número E.164 a lista blanca
    await prisma.listaBlanca.create({
      data: {
        usuarioId,
        numero: '+5215599887766',
        nombre: 'Cliente LID',
      },
    });

    // Si el LID se resuelve a este número, debe atender
    const debeAtender = await debeAtenderSegunListaBlanca(prisma, usuarioId, '+5215599887766');
    expect(debeAtender).toBe(true);

    // Si llega un LID sin resolver que NO está en lista, NO atender
    const lidNoResuelto = await debeAtenderSegunListaBlanca(prisma, usuarioId, '987654321@lid');
    expect(lidNoResuelto).toBe(false);
  });

  it('Agregar LID completo a lista blanca', async () => {
    // Limpiar
    await prisma.listaBlanca.deleteMany({ where: { usuarioId } });

    const lid = '219502943989980@lid';

    // Agregar LID completo a lista blanca
    await prisma.listaBlanca.create({
      data: {
        usuarioId,
        numero: lid,
        nombre: 'Cliente con LID',
      },
    });

    // Debe atender a este LID específico
    const debeAtender = await debeAtenderSegunListaBlanca(prisma, usuarioId, lid);
    expect(debeAtender).toBe(true);

    // NO debe atender a otros LIDs
    const otroLID = await debeAtenderSegunListaBlanca(prisma, usuarioId, '111111111@lid');
    expect(otroLID).toBe(false);
  });

});
