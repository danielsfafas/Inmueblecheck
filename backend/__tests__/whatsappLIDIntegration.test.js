/**
 * Test de integración con BD Postgres REAL para WhatsApp LID
 * 
 * Prueba el flujo completo:
 * 1. Remitente @lid nuevo escribe "Hola"
 * 2. Bot crea prospecto automáticamente
 * 3. Bot envía aviso privacidad + respuesta IA
 * 
 * Este test usa Prisma real (no mock) y detecta errores como:
 * - Invalid enum values (calificacion: "SIN_CALIFICAR" no existe)
 * - Validaciones de campos (telefono con LID)
 */
import { prisma } from '../src/index.js';
import { procesarMensajeBot } from '../src/services/whatsappBot.service.js';
import bcrypt from 'bcryptjs';

let inmobiliariaId;
let usuarioId;
let numeroWhatsappId;

beforeAll(async () => {
  // Crear inmobiliaria de prueba
  const inmobiliaria = await prisma.inmobiliaria.create({
    data: { nombre: 'Test Inmobiliaria LID Integration' },
  });
  inmobiliariaId = inmobiliaria.id;

  // Crear usuario admin
  const usuario = await prisma.usuario.create({
    data: {
      inmobiliariaId,
      nombre: 'Admin LID Test',
      email: `admin-lid-test-${Date.now()}@test.com`,
      password: await bcrypt.hash('password123', 10),
      rol: 'ADMIN',
      activo: true,
    },
  });
  usuarioId = usuario.id;

  // Crear número WhatsApp
  const numeroWhatsapp = await prisma.numeroWhatsapp.create({
    data: {
      usuarioId,
      numero: '+5215599887766',
      nombre: 'WhatsApp Test LID',
      proveedor: 'BAILEYS',
      activo: true,
      estadoConexion: 'connected',
    },
  });
  numeroWhatsappId = numeroWhatsapp.id;
});

afterAll(async () => {
  // Limpiar en orden (cascadas automáticas)
  await prisma.numeroWhatsapp.deleteMany({ where: { usuarioId } });
  await prisma.prospecto.deleteMany({ where: { inmobiliariaId } });
  await prisma.usuario.delete({ where: { id: usuarioId } });
  await prisma.inmobiliaria.delete({ where: { id: inmobiliariaId } });
});

describe('WhatsApp LID Integration - BD Postgres Real', () => {
  
  test('debe crear prospecto automáticamente desde remitente @lid nuevo', async () => {
    // Simular mensaje de remitente LID nuevo
    const remiteLID = '219502943989980@lid';
    const pushName = 'Juan Pérez'; // Nombre visible en WhatsApp
    const mensaje = 'Hola, me interesan las propiedades';
    
    // Verificar que NO existe prospecto antes
    const prospectoAntes = await prisma.prospecto.findFirst({
      where: {
        inmobiliariaId,
        origen: { contains: remiteLID },
      },
    });
    expect(prospectoAntes).toBeNull();

    // Procesar mensaje (AI_PROVIDER=simulado no envía realmente)
    await procesarMensajeBot(
      remiteLID, // telefono (LID completo como fallback)
      mensaje,
      null, // phoneNumberId
      numeroWhatsappId,
      remiteLID, // remoteJid
      pushName // pushName para nombre del prospecto
    );

    // Verificar prospecto creado
    const prospecto = await prisma.prospecto.findFirst({
      where: {
        inmobiliariaId,
        origen: { contains: remiteLID },
      },
    });

    expect(prospecto).not.toBeNull();
    expect(prospecto.nombre).toBe(pushName); // pushName usado como nombre
    expect(prospecto.origen).toContain('WhatsApp LID');
    expect(prospecto.origen).toContain(remiteLID);
    expect(prospecto.ejecutivoId).toBe(usuarioId); // Asignado al dueño del número
    expect(prospecto.calificacion).toBe('FRIO'); // Default del schema
    expect(prospecto.etapa).toBe('NUEVO'); // Default del schema
    
    // Verificar conversación creada
    const conversacion = await prisma.conversacion.findFirst({
      where: {
        prospectoId: prospecto.id,
        numeroWhatsappId,
      },
      include: {
        mensajes: true,
      },
    });

    expect(conversacion).not.toBeNull();
    expect(conversacion.atendidoPorBot).toBe(true);
    expect(conversacion.mensajes.length).toBeGreaterThanOrEqual(2); // Mensaje usuario + bienvenida bot (mínimo)
    
    // Verificar mensaje de bienvenida enviado (con aviso privacidad)
    const mensajeBienvenida = conversacion.mensajes.find(m => m.remitente === 'bot' && m.contenido.includes('privacidad'));
    expect(mensajeBienvenida).toBeDefined();
  });

  test('debe crear prospecto con número E.164 resuelto (no LID)', async () => {
    const telefonoE164 = '+525512345678';
    const pushName = 'María González';
    const mensaje = 'Buenos días';
    
    // Procesar mensaje con teléfono E.164 normal
    await procesarMensajeBot(
      telefonoE164,
      mensaje,
      null,
      numeroWhatsappId,
      `${telefonoE164.substring(1)}@s.whatsapp.net`, // remoteJid clásico
      pushName
    );

    // Verificar prospecto creado
    const prospecto = await prisma.prospecto.findFirst({
      where: {
        telefono: telefonoE164,
        inmobiliariaId,
      },
    });

    expect(prospecto).not.toBeNull();
    expect(prospecto.nombre).toBe(pushName);
    expect(prospecto.telefono).toBe(telefonoE164); // Teléfono E.164 guardado correctamente
    expect(prospecto.origen).toBe('WhatsApp'); // Sin LID en origen
    expect(prospecto.calificacion).toBe('FRIO');
  });

  test('debe respetar lista negra con LID', async () => {
    const remiteLID = '987654321012345@lid';
    const pushName = 'Usuario Bloqueado';
    const mensaje = 'Hola';

    // Agregar a lista negra (por LID completo)
    await prisma.listaNegra.create({
      data: {
        usuarioId,
        numeroRemitente: remiteLID,
        razon: 'Test bloqueo LID',
      },
    });

    // Procesar mensaje
    await procesarMensajeBot(
      remiteLID,
      mensaje,
      null,
      numeroWhatsappId,
      remiteLID,
      pushName
    );

    // Verificar que NO se creó prospecto (bloqueado)
    const prospecto = await prisma.prospecto.findFirst({
      where: {
        inmobiliariaId,
        origen: { contains: remiteLID },
      },
    });

    expect(prospecto).toBeNull(); // No debe crear prospecto si está en lista negra
  });
});
