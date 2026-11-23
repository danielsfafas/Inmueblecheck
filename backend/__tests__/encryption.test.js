import { describe, it, expect, beforeAll } from '@jest/globals';
import { encrypt, decrypt, generateEncryptionKey } from '../src/utils/encryption.js';

describe('Encryption', () => {
  describe('encrypt/decrypt', () => {
    it('debe cifrar y descifrar texto correctamente', () => {
      const textoOriginal = 'EAAD1234567890abcdef_secret_token';
      
      const cifrado = encrypt(textoOriginal);
      const descifrado = decrypt(cifrado);
      
      expect(descifrado).toBe(textoOriginal);
    });

    it('debe generar texto cifrado diferente cada vez (IV aleatorio)', () => {
      const texto = 'mismo_texto';
      
      const cifrado1 = encrypt(texto);
      const cifrado2 = encrypt(texto);
      
      expect(cifrado1).not.toBe(cifrado2);
      
      // Pero ambos deben descifrar al mismo valor
      expect(decrypt(cifrado1)).toBe(texto);
      expect(decrypt(cifrado2)).toBe(texto);
    });

    it('debe manejar texto nulo', () => {
      expect(encrypt(null)).toBeNull();
      expect(decrypt(null)).toBeNull();
    });

    it('debe cifrar session data JSON', () => {
      const sessionData = JSON.stringify({
        session: 'data',
        credentials: { user: 'test' },
      });
      
      const cifrado = encrypt(sessionData);
      const descifrado = decrypt(cifrado);
      
      expect(descifrado).toBe(sessionData);
      expect(JSON.parse(descifrado).session).toBe('data');
    });

    it('debe rechazar formato de cifrado inválido', () => {
      expect(() => decrypt('invalid')).toThrow();
      expect(() => decrypt('a:b')).toThrow();
    });

    it('debe rechazar authTag inválido', () => {
      const cifrado = encrypt('test');
      const partes = cifrado.split(':');
      
      // Modificar authTag
      const cifradoInvalido = `${partes[0]}:${'0'.repeat(32)}:${partes[2]}`;
      
      expect(() => decrypt(cifradoInvalido)).toThrow();
    });
  });

  describe('generateEncryptionKey', () => {
    it('debe generar clave de 64 caracteres hex (32 bytes)', () => {
      const key = generateEncryptionKey();
      
      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('debe generar claves diferentes', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('formato de cifrado', () => {
    it('debe usar formato iv:authTag:encrypted', () => {
      const cifrado = encrypt('test');
      const partes = cifrado.split(':');
      
      expect(partes).toHaveLength(3);
      
      // IV: 16 bytes = 32 hex chars
      expect(partes[0]).toHaveLength(32);
      
      // AuthTag: 16 bytes = 32 hex chars
      expect(partes[1]).toHaveLength(32);
      
      // Encrypted: variable length
      expect(partes[2].length).toBeGreaterThan(0);
    });
  });
});
