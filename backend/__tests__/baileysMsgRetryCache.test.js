/**
 * Test: Baileys msgRetryCounterCache debe implementar get/set/del
 * 
 * Error reportado por Daniel:
 * - Logs: "Failed to send retry" -> "TypeError: msgRetryCache.set is not a function"
 * - En messages-recv.js sendRetryRequest después de "No session found to decrypt message"
 * 
 * Causa: msgRetryCounterCache: {} (objeto vacío) no tiene métodos get/set/del
 * Fix: Usar NodeCache que implementa la interfaz que Baileys espera
 */
import { describe, it, expect } from '@jest/globals';
import NodeCache from 'node-cache';

describe('Baileys msgRetryCounterCache - Interface correcta', () => {

  it('NodeCache debe tener método get', () => {
    const cache = new NodeCache();
    expect(typeof cache.get).toBe('function');
    
    // Debe funcionar
    cache.set('test-key', 'test-value');
    const value = cache.get('test-key');
    expect(value).toBe('test-value');
  });

  it('NodeCache debe tener método set', () => {
    const cache = new NodeCache();
    expect(typeof cache.set).toBe('function');
    
    // Debe funcionar sin error
    const result = cache.set('key1', 'value1');
    expect(result).toBe(true);
  });

  it('NodeCache debe tener método del', () => {
    const cache = new NodeCache();
    expect(typeof cache.del).toBe('function');
    
    cache.set('key2', 'value2');
    const deleted = cache.del('key2');
    expect(deleted).toBe(1); // Número de keys eliminadas
    
    const value = cache.get('key2');
    expect(value).toBeUndefined();
  });

  it('NodeCache debe manejar TTL (Time To Live)', () => {
    const cache = new NodeCache({ stdTTL: 1 }); // 1 segundo
    cache.set('expire-key', 'expire-value');
    
    // Debe existir inmediatamente
    expect(cache.get('expire-key')).toBe('expire-value');
    
    // TTL configurado correctamente
    expect(cache.getTtl('expire-key')).toBeGreaterThan(Date.now());
  });

  it('Objeto vacío {} NO tiene get/set/del (error original)', () => {
    const plainObject = {};
    
    // Verificar que el objeto vacío NO tiene estos métodos
    expect(plainObject.get).toBeUndefined();
    expect(plainObject.set).toBeUndefined();
    expect(plainObject.del).toBeUndefined();
    
    // Esto causaría: TypeError: msgRetryCache.set is not a function
    expect(() => {
      plainObject.set('key', 'value');
    }).toThrow();
  });

  it('NodeCache debe manejar claves complejas (retry counters)', () => {
    const cache = new NodeCache();
    
    // Simular estructura de retry counter de Baileys
    const messageId = 'BAE5F4B2D1C3A4E5';
    const retryCount = 1;
    
    cache.set(messageId, retryCount);
    expect(cache.get(messageId)).toBe(1);
    
    // Incrementar retry
    cache.set(messageId, 2);
    expect(cache.get(messageId)).toBe(2);
    
    // Eliminar después de éxito
    cache.del(messageId);
    expect(cache.get(messageId)).toBeUndefined();
  });

});
