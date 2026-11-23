import fs from 'fs/promises';

/**
 * Magic bytes (firmas) de tipos de archivo de video soportados
 */
const VIDEO_SIGNATURES = {
  // MP4: ftyp en bytes 4-8
  mp4: [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // 'ftyp'
  ],
  // WebM: EBML header
  webm: [
    { offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] }, // EBML
  ],
  // MOV/QuickTime: también usa 'ftyp' pero con diferentes brands
  mov: [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // 'ftyp'
  ],
};

/**
 * Valida el tipo de archivo usando magic bytes (firma del archivo)
 * @param {string} filePath - Ruta del archivo
 * @param {string[]} allowedTypes - Tipos permitidos: ['mp4', 'webm', 'mov']
 * @returns {Promise<{valid: boolean, detectedType: string|null}>}
 */
export async function validateVideoType(filePath, allowedTypes = ['mp4', 'webm', 'mov']) {
  try {
    // Leer los primeros 32 bytes del archivo
    const buffer = Buffer.alloc(32);
    const fileHandle = await fs.open(filePath, 'r');
    await fileHandle.read(buffer, 0, 32, 0);
    await fileHandle.close();

    // Verificar cada tipo permitido
    for (const type of allowedTypes) {
      const signatures = VIDEO_SIGNATURES[type];
      if (!signatures) continue;

      for (const signature of signatures) {
        const matches = signature.bytes.every((byte, index) => {
          return buffer[signature.offset + index] === byte;
        });

        if (matches) {
          // Para MP4 y MOV, verificar el brand para distinguirlos
          if (type === 'mp4' || type === 'mov') {
            const brand = buffer.slice(8, 12).toString('ascii');
            // Brands comunes de MP4
            const mp4Brands = ['isom', 'mp41', 'mp42', 'avc1', 'iso2', 'iso4', 'iso5'];
            // Brands comunes de MOV
            const movBrands = ['qt  ', 'M4V ', 'M4A '];

            if (mp4Brands.includes(brand)) {
              return { valid: true, detectedType: 'mp4' };
            } else if (movBrands.includes(brand)) {
              return { valid: true, detectedType: 'mov' };
            }
            // Si no podemos determinar el brand específico, aceptar como MP4
            return { valid: true, detectedType: 'mp4' };
          }

          return { valid: true, detectedType: type };
        }
      }
    }

    return { valid: false, detectedType: null };
  } catch (error) {
    console.error('Error validando tipo de archivo:', error);
    return { valid: false, detectedType: null };
  }
}

/**
 * Valida el tamaño del archivo
 * @param {number} sizeInBytes - Tamaño en bytes
 * @param {number} maxSizeMB - Tamaño máximo en MB (default 200 MB)
 * @returns {boolean}
 */
export function validateFileSize(sizeInBytes, maxSizeMB = 200) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return sizeInBytes <= maxSizeBytes;
}
