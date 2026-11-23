/**
 * Normalizar número de teléfono a formato E.164
 * Ejemplos:
 *   5512345678 -> +525512345678
 *   +52 55 1234 5678 -> +525512345678
 *   521234567890 -> +521234567890
 */
export function normalizarNumeroE164(numero) {
  if (!numero) return null;

  // Eliminar todo excepto dígitos y el símbolo +
  let limpio = numero.toString().replace(/[^\d+]/g, '');

  // Si no tiene +, agregarlo
  if (!limpio.startsWith('+')) {
    // Si comienza con 52 (México), agregar +
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

  // Validar formato E.164 básico: + seguido de 10-15 dígitos
  const e164Regex = /^\+\d{10,15}$/;
  if (!e164Regex.test(limpio)) {
    return null;
  }

  return limpio;
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
 */
export async function estaEnListaNegra(prisma, usuarioId, numeroRemitente) {
  const numeroNormalizado = normalizarNumeroE164(numeroRemitente);
  
  if (!numeroNormalizado) {
    return false;
  }

  const entrada = await prisma.listaNegra.findFirst({
    where: {
      usuarioId,
      numeroRemitente: numeroNormalizado,
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
