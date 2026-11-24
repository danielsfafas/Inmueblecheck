/**
 * Normalizar número de teléfono a formato E.164 canónico
 * Para números mexicanos: SIEMPRE +52 + 10 dígitos (sin el 1 de en medio)
 * Ejemplos:
 *   5512345678 -> +525512345678
 *   +52 55 1234 5678 -> +525512345678
 *   5218115556484 -> +528115556484 (elimina el 1)
 *   +5218115556484 -> +528115556484 (elimina el 1)
 */
export function normalizarNumeroE164(numero) {
  if (!numero) return null;

  // Eliminar todo excepto dígitos y el símbolo +
  let limpio = numero.toString().replace(/[^\d+]/g, '');

  // Si no tiene +, agregarlo
  if (!limpio.startsWith('+')) {
    // Si comienza con 52 (México)
    if (limpio.startsWith('52')) {
      limpio = '+' + limpio;
    }
    // Si tiene 10 dígitos (número local mexicano), agregar +52
    else if (limpio.length === 10) {
      limpio = '+52' + limpio;
    }
    // Si tiene 11 dígitos y comienza con 1 (número USA/Canadá), agregar +
    else if (limpio.length === 11 && limpio.startsWith('1')) {
      limpio = '+' + limpio;
    }
    // De lo contrario, asumir +52 México
    else {
      limpio = '+52' + limpio;
    }
  }

  // NORMALIZACIÓN CANÓNICA MÉXICO: +52 + 10 dígitos (sin el 1 de en medio)
  // Formato con 1: +5218115556484 (14 dígitos total) → +528115556484 (13 dígitos total)
  if (limpio.startsWith('+521') && limpio.length === 14) {
    // Eliminar el 1: +521 + 10 dígitos → +52 + 10 dígitos
    limpio = '+52' + limpio.substring(4);
  }

  // Validar formato E.164 básico: + seguido de 10-15 dígitos
  const e164Regex = /^\+\d{10,15}$/;
  if (!e164Regex.test(limpio)) {
    return null;
  }

  return limpio;
}

/**
 * Generar variantes de número mexicano para búsqueda en DB
 * Bug fix: números con/sin el '1' de en medio deben matchear
 * Ejemplos:
 *   +528115556484 -> ['+528115556484', '+5218115556484', '8115556484']
 *   +5218115556484 -> ['+528115556484', '+5218115556484', '8115556484']
 *   219502943989980@lid -> [] (no es número MX, es LID)
 */
export function variantesNumeroMX(numero) {
  if (!numero) return [];

  // Si es LID, no generar variantes
  if (numero.includes('@')) return [];

  const normalizado = normalizarNumeroE164(numero);
  if (!normalizado) return [];

  // Solo para números mexicanos (+52...)
  if (!normalizado.startsWith('+52')) return [];

  // Extraer últimos 10 dígitos
  const last10 = normalizado.slice(-10);

  // Si es muy corto, no generar variantes
  if (last10.length !== 10) return [];

  return [
    '+52' + last10,      // +528115556484 (canónico)
    '+521' + last10,     // +5218115556484 (con 1)
    last10,              // 8115556484 (10 dígitos locales)
  ];
}

/**
 * Enmascarar credenciales sensibles antes de enviar al frontend
 */
export function enmascarCredenciales(numeroWhatsapp) {
  if (!numeroWhatsapp) return null;

  const { accessToken, sessionData, ...resto } = numeroWhatsapp;

  // Para credenciales cifradas, solo mostrar que existen
  return {
    ...resto,
    accessToken: accessToken ? '[ENCRYPTED]' : null,
    sessionData: sessionData ? '[ENCRYPTED]' : null,
  };
}

/**
 * Verificar si un número remitente está en la lista negra del dueño del número receptor
 * Compara contra número normalizado E.164, variantes MX (+52/+521) Y contra LID (si aplica)
 * @param {string} numeroRemitente - Puede ser E.164 (+525512345678) o LID completo (219502943989980@lid)
 */
export async function estaEnListaNegra(prisma, usuarioId, numeroRemitente) {
  const numeroNormalizado = normalizarNumeroE164(numeroRemitente);
  const variantes = variantesNumeroMX(numeroRemitente);
  
  // Buscar por número normalizado, variantes MX O remitente original (LID)
  const entrada = await prisma.listaNegra.findFirst({
    where: {
      usuarioId,
      OR: [
        // Comparar contra número E.164 normalizado
        ...(numeroNormalizado ? [{ numeroRemitente: numeroNormalizado }] : []),
        // Comparar contra variantes mexicanas (+52, +521, 10 dígitos)
        ...variantes.map(v => ({ numeroRemitente: v })),
        // Comparar contra LID completo o número sin normalizar
        { numeroRemitente: numeroRemitente },
      ],
    },
  });

  return !!entrada;
}

/**
 * Verificar si un número debe ser atendido según lista blanca (whitelist)
 * Regla de Daniel: si lista blanca está VACÍA → atiende a TODOS
 * Si tiene al menos 1 número → SOLO atiende a números en la lista
 * @returns {Promise<boolean>} true si debe atender, false si ignorar
 */
export async function debeAtenderSegunListaBlanca(prisma, usuarioId, numeroRemitente) {
  // Contar entradas en lista blanca del usuario
  const countListaBlanca = await prisma.listaBlanca.count({
    where: { usuarioId },
  });

  // Si lista blanca está vacía → atender a todos
  if (countListaBlanca === 0) {
    return true;
  }

  // Si tiene entradas → solo atender si el número está en la lista
  const numeroNormalizado = normalizarNumeroE164(numeroRemitente);
  const variantes = variantesNumeroMX(numeroRemitente);
  
  const entrada = await prisma.listaBlanca.findFirst({
    where: {
      usuarioId,
      OR: [
        // Comparar contra número E.164 normalizado
        ...(numeroNormalizado ? [{ numero: numeroNormalizado }] : []),
        // Comparar contra variantes mexicanas (+52, +521, 10 dígitos)
        ...variantes.map(v => ({ numero: v })),
        // Comparar contra LID completo o número sin normalizar
        { numero: numeroRemitente },
      ],
    },
  });

  return !!entrada;
}

/**
 * Encontrar número WhatsApp receptor por phone_number_id (Meta Cloud API)
 */
export async function encontrarNumeroPorPhoneNumberId(prisma, phoneNumberId) {
  return await prisma.numeroWhatsapp.findFirst({
    where: {
      phoneNumberId,
      activo: true,
    },
    include: {
      usuario: {
        include: {
          inmobiliaria: true,
        },
      },
    },
  });
}

/**
 * Encontrar número WhatsApp receptor por número normalizado
 */
export async function encontrarNumeroPorNumero(prisma, numero) {
  const numeroNormalizado = normalizarNumeroE164(numero);
  
  if (!numeroNormalizado) {
    return null;
  }

  return await prisma.numeroWhatsapp.findFirst({
    where: {
      numero: numeroNormalizado,
      activo: true,
    },
    include: {
      usuario: {
        include: {
          inmobiliaria: true,
        },
      },
    },
  });
}
