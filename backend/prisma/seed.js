import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos de demostración (SOLO PARA DESARROLLO)...');
  console.log('⚠️  Las contraseñas de este seed son débiles y solo para propósitos de desarrollo.');
  console.log('⚠️  NO USAR EN PRODUCCIÓN.');

  // 1. Crear inmobiliaria de ejemplo
  const inmobiliaria = await prisma.inmobiliaria.upsert({
    where: { email: 'contacto@casashidalgo.com.mx' },
    update: {},
    create: {
      slug: 'casas-hidalgo',
      nombre: 'Casas Hidalgo',
      razonSocial: 'Inmobiliaria Casas Hidalgo S.A. de C.V.',
      rfc: 'ICH2020123A1',
      domicilio: 'Av. Juárez 123, Centro, Tepeapulco, Hidalgo, C.P. 43900',
      telefono: '7757451234',
      email: 'contacto@casashidalgo.com.mx',
      emailPrivacidad: 'privacidad@casashidalgo.com.mx',
      horario: 'Lunes a Viernes: 9:00 - 18:00, Sábados: 9:00 - 14:00',
      activa: true,
      registroProfeco: 'PFC.B.E.7/123456-2024',
      leyendaProfeco: 'Para cualquier aclaración o reclamación, puede contactar a PROFECO en el teléfono 55 5568 8722 o en www.profeco.gob.mx',
      leyendaNom247: 'El precio final puede variar según gastos notariales y de crédito. Consulte con nuestros asesores.',
      permiteCookies: false,
    },
  });

  console.log(`✅ Inmobiliaria creada: ${inmobiliaria.nombre}`);

  // 2. Crear usuarios
  const passwordHash = await bcrypt.hash('Demo2024!', 10);

  const admin = await prisma.usuario.upsert({
    where: { 
      inmobiliariaId_email: {
        inmobiliariaId: inmobiliaria.id,
        email: 'admin@casashidalgo.com.mx'
      }
    },
    update: {},
    create: {
      inmobiliariaId: inmobiliaria.id,
      nombre: 'Daniel Ramírez',
      email: 'admin@casashidalgo.com.mx',
      password: passwordHash,
      rol: 'ADMIN',
      activo: true,
    },
  });

  const ejecutivo1 = await prisma.usuario.upsert({
    where: { 
      inmobiliariaId_email: {
        inmobiliariaId: inmobiliaria.id,
        email: 'maria.lopez@casashidalgo.com.mx'
      }
    },
    update: {},
    create: {
      inmobiliariaId: inmobiliaria.id,
      nombre: 'María López',
      email: 'maria.lopez@casashidalgo.com.mx',
      password: passwordHash,
      rol: 'EJECUTIVO',
      activo: true,
    },
  });

  const ejecutivo2 = await prisma.usuario.upsert({
    where: { 
      inmobiliariaId_email: {
        inmobiliariaId: inmobiliaria.id,
        email: 'carlos.garcia@casashidalgo.com.mx'
      }
    },
    update: {},
    create: {
      inmobiliariaId: inmobiliaria.id,
      nombre: 'Carlos García',
      email: 'carlos.garcia@casashidalgo.com.mx',
      password: passwordHash,
      rol: 'EJECUTIVO',
      activo: true,
    },
  });

  console.log(`✅ Usuarios creados: Admin, 2 Ejecutivos`);
  console.log(`   📧 Email: admin@casashidalgo.com.mx | Contraseña: Demo2024! (SOLO DESARROLLO)`);
  console.log(`   📧 Email: maria.lopez@casashidalgo.com.mx | Contraseña: Demo2024! (SOLO DESARROLLO)`);
  console.log(`   📧 Email: carlos.garcia@casashidalgo.com.mx | Contraseña: Demo2024! (SOLO DESARROLLO)`);

  // 3. Crear propiedades de ejemplo
  const propiedades = [
    {
      titulo: 'Casa en Tepeapulco Centro',
      descripcion: 'Hermosa casa en el centro de Tepeapulco, cerca de todos los servicios. Cuenta con amplios espacios, jardín y cochera techada. Ideal para familias.',
      tipo: 'VENTA',
      precio: 1850000,
      colonia: 'Centro',
      ciudad: 'Tepeapulco',
      estado: 'Hidalgo',
      codigoPostal: '43900',
      latitud: 19.7850,
      longitud: -98.5531,
      latitudAprox: 19.7855,
      longitudAprox: -98.5535,
      metrosTerreno: 180,
      metrosConstruccion: 120,
      recamaras: 3,
      banos: 2,
      estacionamientos: 2,
      aceptaContado: true,
      aceptaBancario: true,
      aceptaInfonavit: true,
      aceptaFovissste: false,
      estadoPropiedad: 'DISPONIBLE',
      fotos: [
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg'
      ],
    },
    {
      titulo: 'Departamento en Ciudad Sahagún',
      descripcion: 'Departamento moderno en Ciudad Sahagún, en segundo piso. Excelente ubicación cerca de zona industrial. Incluye closets y cocina integral.',
      tipo: 'RENTA',
      precio: 4500,
      colonia: 'Emiliano Zapata',
      ciudad: 'Ciudad Sahagún',
      estado: 'Hidalgo',
      codigoPostal: '43990',
      latitud: 19.7780,
      longitud: -98.5750,
      latitudAprox: 19.7785,
      longitudAprox: -98.5755,
      metrosConstruccion: 65,
      recamaras: 2,
      banos: 1,
      estacionamientos: 1,
      aceptaContado: true,
      aceptaBancario: false,
      aceptaInfonavit: false,
      aceptaFovissste: false,
      estadoPropiedad: 'DISPONIBLE',
      fotos: [
        '/demo/placeholder-departamento.svg',
        '/demo/placeholder-departamento.svg'
      ],
    },
    {
      titulo: 'Casa amplia en Tepeapulco',
      descripcion: 'Casa de dos plantas en zona tranquila de Tepeapulco. Amplio patio trasero, recámaras con closet y baño completo. Excelente para inversión.',
      tipo: 'VENTA',
      precio: 2450000,
      colonia: 'La Morena',
      ciudad: 'Tepeapulco',
      estado: 'Hidalgo',
      codigoPostal: '43900',
      latitud: 19.7900,
      longitud: -98.5600,
      latitudAprox: 19.7905,
      longitudAprox: -98.5605,
      metrosTerreno: 220,
      metrosConstruccion: 160,
      recamaras: 4,
      banos: 3,
      estacionamientos: 2,
      aceptaContado: true,
      aceptaBancario: true,
      aceptaInfonavit: true,
      aceptaFovissste: true,
      estadoPropiedad: 'DISPONIBLE',
      fotos: [
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg'
      ],
      vistas: 15,
      clicsWhatsapp: 3,
    },
    {
      titulo: 'Casa en Ciudad Sahagún con jardín',
      descripcion: 'Bonita casa de un nivel en Ciudad Sahagún. Tiene jardín frontal y trasero, cochera para 1 auto, cocina integral. Cerca de escuelas y comercios.',
      tipo: 'VENTA',
      precio: 1650000,
      colonia: 'Morelos',
      ciudad: 'Ciudad Sahagún',
      estado: 'Hidalgo',
      codigoPostal: '43990',
      latitud: 19.7820,
      longitud: -98.5680,
      latitudAprox: 19.7825,
      longitudAprox: -98.5685,
      metrosTerreno: 150,
      metrosConstruccion: 95,
      recamaras: 3,
      banos: 2,
      estacionamientos: 1,
      aceptaContado: true,
      aceptaBancario: true,
      aceptaInfonavit: true,
      aceptaFovissste: false,
      estadoPropiedad: 'DISPONIBLE',
      fotos: [
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg'
      ],
      vistas: 8,
      clicsWhatsapp: 1,
    },
    {
      titulo: 'Departamento amueblado en renta',
      descripcion: 'Departamento completamente amueblado, listo para habitar. Incluye electrodomésticos, muebles de sala y recámaras. Ideal para ejecutivos.',
      tipo: 'RENTA',
      precio: 6000,
      colonia: 'Centro',
      ciudad: 'Tepeapulco',
      estado: 'Hidalgo',
      codigoPostal: '43900',
      latitud: 19.7865,
      longitud: -98.5545,
      latitudAprox: 19.7870,
      longitudAprox: -98.5550,
      metrosConstruccion: 75,
      recamaras: 2,
      banos: 1,
      estacionamientos: 1,
      aceptaContado: true,
      aceptaBancario: false,
      aceptaInfonavit: false,
      aceptaFovissste: false,
      estadoPropiedad: 'DISPONIBLE',
      fotos: [
        '/demo/placeholder-departamento.svg',
        '/demo/placeholder-departamento.svg'
      ],
      vistas: 22,
      clicsWhatsapp: 5,
    },
    {
      titulo: 'Casa residencial con alberca',
      descripcion: 'Hermosa residencia en privada con alberca común, áreas verdes y seguridad 24/7. Casa de lujo con acabados de primera. Incluye cuarto de servicio.',
      tipo: 'VENTA',
      precio: 3850000,
      colonia: 'Los Fresnos',
      ciudad: 'Tepeapulco',
      estado: 'Hidalgo',
      codigoPostal: '43900',
      latitud: 19.7920,
      longitud: -98.5480,
      latitudAprox: 19.7925,
      longitudAprox: -98.5485,
      metrosTerreno: 280,
      metrosConstruccion: 220,
      recamaras: 4,
      banos: 3,
      estacionamientos: 3,
      aceptaContado: true,
      aceptaBancario: true,
      aceptaInfonavit: false,
      aceptaFovissste: false,
      estadoPropiedad: 'APARTADA',
      fotos: [
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg'
      ],
      vistas: 45,
      clicsWhatsapp: 12,
    },
    {
      titulo: 'Local comercial en renta',
      descripcion: 'Local comercial sobre avenida principal en Tepeapulco. Excelente ubicación para cualquier tipo de negocio. Baño y bodega incluidos.',
      tipo: 'RENTA',
      precio: 8500,
      colonia: 'Centro',
      ciudad: 'Tepeapulco',
      estado: 'Hidalgo',
      codigoPostal: '43900',
      latitud: 19.7840,
      longitud: -98.5520,
      latitudAprox: 19.7845,
      longitudAprox: -98.5525,
      metrosConstruccion: 55,
      recamaras: 0,
      banos: 1,
      estacionamientos: 0,
      aceptaContado: true,
      aceptaBancario: false,
      aceptaInfonavit: false,
      aceptaFovissste: false,
      estadoPropiedad: 'DISPONIBLE',
      fotos: [
        '/demo/placeholder-casa.svg',
        '/demo/placeholder-casa.svg'
      ],
      vistas: 18,
      clicsWhatsapp: 4,
    },
    {
      titulo: 'Terreno en Ciudad Sahagún',
      descripcion: 'Terreno plano en zona de crecimiento en Ciudad Sahagún. Ideal para construir casa habitación o pequeño desarrollo. Servicios cercanos.',
      tipo: 'VENTA',
      precio: 950000,
      colonia: 'Ampliación Morelos',
      ciudad: 'Ciudad Sahagún',
      estado: 'Hidalgo',
      codigoPostal: '43990',
      latitud: 19.7795,
      longitud: -98.5720,
      latitudAprox: 19.7800,
      longitudAprox: -98.5725,
      metrosTerreno: 200,
      metrosConstruccion: 0,
      recamaras: 0,
      banos: 0,
      estacionamientos: 0,
      aceptaContado: true,
      aceptaBancario: true,
      aceptaInfonavit: false,
      aceptaFovissste: false,
      estadoPropiedad: 'VENDIDA',
      fotos: [
        '/demo/placeholder-terreno.svg'
      ],
      vistas: 32,
      clicsWhatsapp: 8,
    },
  ];

  for (const prop of propiedades) {
    await prisma.propiedad.create({
      data: {
        ...prop,
        inmobiliariaId: inmobiliaria.id,
      },
    });
  }

  console.log(`✅ ${propiedades.length} propiedades creadas`);

  // 4. Crear prospectos de ejemplo
  const prospectos = [
    {
      nombre: 'Juan Pérez Martínez',
      telefono: '7751234567',
      email: 'juan.perez@email.com',
      presupuesto: 2000000,
      formaPago: 'Crédito bancario',
      creditoPreaprobado: 1800000,
      calificacion: 'CALIENTE',
      origen: 'Facebook',
      ejecutivoId: ejecutivo1.id,
      etapa: 'VISITA',
    },
    {
      nombre: 'María Sánchez Flores',
      telefono: '7757890123',
      email: 'maria.sanchez@email.com',
      presupuesto: 1500000,
      formaPago: 'Infonavit',
      creditoPreaprobado: 1200000,
      calificacion: 'TIBIO',
      origen: 'Instagram',
      ejecutivoId: ejecutivo1.id,
      etapa: 'CONTACTADO',
    },
    {
      nombre: 'Roberto González López',
      telefono: '7759876543',
      email: null,
      presupuesto: 500000,
      formaPago: 'Contado',
      creditoPreaprobado: null,
      calificacion: 'FRIO',
      origen: 'WhatsApp directo',
      ejecutivoId: ejecutivo2.id,
      etapa: 'NUEVO',
    },
    {
      nombre: 'Ana Laura Ramírez',
      telefono: '7752345678',
      email: 'analaura@email.com',
      presupuesto: 3500000,
      formaPago: 'Contado',
      creditoPreaprobado: null,
      calificacion: 'CALIENTE',
      origen: 'Recomendación',
      ejecutivoId: ejecutivo2.id,
      etapa: 'APARTADO',
    },
    {
      nombre: 'Luis Fernando Cruz',
      telefono: '7758765432',
      email: 'luiscruz@email.com',
      presupuesto: 5000,
      formaPago: 'Renta mensual',
      creditoPreaprobado: null,
      calificacion: 'TIBIO',
      origen: 'Facebook',
      ejecutivoId: ejecutivo1.id,
      etapa: 'OFERTA',
    },
  ];

  for (const prosp of prospectos) {
    await prisma.prospecto.create({
      data: {
        ...prosp,
        inmobiliariaId: inmobiliaria.id,
      },
    });
  }

  const prospectosCreados = [];
  for (const prosp of prospectos) {
    const p = await prisma.prospecto.create({
      data: {
        ...prosp,
        inmobiliariaId: inmobiliaria.id,
      },
    });
    prospectosCreados.push(p);
  }

  console.log(`✅ ${prospectos.length} prospectos creados`);

  // 4.1. Crear actividades de ejemplo para los prospectos
  const actividades = [
    {
      prospectoId: prospectosCreados[0].id,
      usuarioId: ejecutivo1.id,
      tipo: 'MENSAJE',
      titulo: 'Primer contacto por WhatsApp',
      descripcion: 'Cliente interesado en casa de 2.5M en Tepeapulco Centro. Pregunta por opciones de crédito bancario.',
    },
    {
      prospectoId: prospectosCreados[0].id,
      usuarioId: ejecutivo1.id,
      tipo: 'LLAMADA',
      titulo: 'Llamada de seguimiento',
      descripcion: 'Cliente confirmó visita para el sábado 10:00 AM. Tiene pre-aprobación del banco por $1.8M.',
    },
    {
      prospectoId: prospectosCreados[0].id,
      usuarioId: ejecutivo1.id,
      tipo: 'VISITA',
      titulo: 'Visita a propiedad',
      descripcion: 'Visitó la casa en Tepeapulco Centro. Le gustó mucho, especialmente el jardín. Va a consultar con su esposa.',
    },
    {
      prospectoId: prospectosCreados[1].id,
      usuarioId: ejecutivo2.id,
      tipo: 'MENSAJE',
      titulo: 'Contacto inicial por Facebook',
      descripcion: 'Pregunta por departamentos en renta cerca del centro.',
    },
    {
      prospectoId: prospectosCreados[2].id,
      usuarioId: ejecutivo1.id,
      tipo: 'LLAMADA',
      titulo: 'Cliente busca terreno',
      descripcion: 'Interesado en terrenos para construcción. Presupuesto amplio de hasta $4M.',
    },
    {
      prospectoId: prospectosCreados[2].id,
      usuarioId: ejecutivo1.id,
      tipo: 'NOTA',
      titulo: 'Cliente VIP',
      descripcion: 'Excelente prospecto. Tiene crédito pre-aprobado y liquidez inmediata. Priorizar.',
    },
    {
      prospectoId: prospectosCreados[3].id,
      usuarioId: ejecutivo2.id,
      tipo: 'MENSAJE',
      titulo: 'Consulta sobre casa en Sahagún',
      descripcion: 'Pregunta si acepta Infonavit. Le confirmé que sí.',
    },
  ];

  for (const act of actividades) {
    await prisma.actividad.create({
      data: {
        ...act,
        inmobiliariaId: inmobiliaria.id,
      },
    });
  }

  console.log(`✅ ${actividades.length} actividades creadas`);

  // 4.2. Crear recordatorios de ejemplo
  const ahora = new Date();
  const manana = new Date(ahora);
  manana.setDate(ahora.getDate() + 1);
  manana.setHours(10, 0, 0, 0);

  const pasadoManana = new Date(ahora);
  pasadoManana.setDate(ahora.getDate() + 2);
  pasadoManana.setHours(15, 30, 0, 0);

  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  ayer.setHours(14, 0, 0, 0);

  const recordatorios = [
    {
      prospectoId: prospectosCreados[0].id,
      usuarioId: ejecutivo1.id,
      titulo: 'Seguimiento post-visita',
      descripcion: 'Llamar para saber decisión después de consultar con esposa',
      fechaRecordatorio: manana,
      completado: false,
    },
    {
      prospectoId: prospectosCreados[2].id,
      usuarioId: ejecutivo1.id,
      titulo: 'Enviar opciones de terrenos',
      descripcion: 'Preparar catálogo de terrenos disponibles y enviar por WhatsApp',
      fechaRecordatorio: pasadoManana,
      completado: false,
    },
    {
      prospectoId: prospectosCreados[3].id,
      usuarioId: ejecutivo2.id,
      titulo: 'Agendar visita',
      descripcion: 'Llamar para agendar visita a casa en Sahagún',
      fechaRecordatorio: ayer,
      completado: false,
    },
  ];

  for (const rec of recordatorios) {
    await prisma.recordatorio.create({
      data: {
        ...rec,
        inmobiliariaId: inmobiliaria.id,
      },
    });
  }

  console.log(`✅ ${recordatorios.length} recordatorios creados (1 vencido, 2 pendientes)`);

  // 5. Crear algunos consentimientos de ejemplo
  await prisma.consentimiento.create({
    data: {
      inmobiliariaId: inmobiliaria.id,
      titular: 'Juan Pérez Martínez',
      tipo: 'AVISO_PRIVACIDAD',
      accion: 'OTORGA',
      versionDocumento: '1.0',
      textoHash: 'abc123',
      canal: 'web',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
    },
  });

  await prisma.consentimiento.create({
    data: {
      inmobiliariaId: inmobiliaria.id,
      titular: 'María Sánchez Flores',
      tipo: 'DATOS_FINANCIEROS',
      accion: 'OTORGA',
      versionDocumento: '1.0',
      textoHash: 'def456',
      canal: 'web',
      ip: '192.168.1.101',
      userAgent: 'Mozilla/5.0',
    },
  });

  console.log('✅ Consentimientos de ejemplo creados');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📋 Resumen:');
  console.log(`   - 1 Inmobiliaria: ${inmobiliaria.nombre}`);
  console.log(`   - 3 Usuarios (1 Admin, 2 Ejecutivos)`);
  console.log(`   - ${propiedades.length} Propiedades (6 disponibles, 1 apartada, 1 vendida)`);
  console.log(`   - ${prospectos.length} Prospectos`);
  console.log(`   - ${actividades.length} Actividades (mensajes, llamadas, visitas, notas)`);
  console.log(`   - ${recordatorios.length} Recordatorios (1 vencido, 2 pendientes)`);
  console.log('\n🔑 Credenciales de acceso:');
  console.log('   Admin: admin@casashidalgo.com.mx / Demo2024!');
  console.log('   Ejecutivo 1: maria.lopez@casashidalgo.com.mx / Demo2024!');
  console.log('   Ejecutivo 2: carlos.garcia@casashidalgo.com.mx / Demo2024!');
  console.log('\n📌 Nota: El dashboard mostrará 1 recordatorio vencido para pruebas.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
