import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Obtener clave de cifrado desde env
 */
function getEncryptionKey() {
  const key = process.env.WHATSAPP_ENC_KEY;
  
  if (!key) {
    console.warn('⚠️  WHATSAPP_ENC_KEY no configurada - usando clave por defecto (NO para producción)');
    return Buffer.from('dev_encryption_key_change_in_prod_32bytes!'.slice(0, 32));
  }
  
  // Convertir clave hex a buffer o usar directamente si es string
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Si es string, hacer hash SHA-256 para obtener 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Cifrar texto con AES-256-GCM
 * @param {string} text - Texto a cifrar
 * @returns {string} - Texto cifrado en formato: iv:authTag:encrypted (hex)
 */
export function encrypt(text) {
  if (!text) return null;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Formato: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error cifrando:', error);
    throw new Error('Error en cifrado');
  }
}

/**
 * Descifrar texto con AES-256-GCM
 * @param {string} encryptedText - Texto cifrado en formato: iv:authTag:encrypted
 * @returns {string} - Texto descifrado
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Formato de texto cifrado inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error descifrando:', error);
    throw new Error('Error en descifrado');
  }
}

/**
 * Generar clave de cifrado aleatoria (para setup inicial)
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}
