/**
 * Test: Normalización y variantes de números mexicanos
 * 
 * Bug reportado por Daniel:
 * - Whitelist guardó: 8115556484 → normalizado +528115556484
 * - WhatsApp entregó (LID resolved): 5218115556484 → normalizado +5218115556484
 * - No matchean → bot ignora usuario whitelisted
 * 
 * Fix:
 * - Normalizar a formato canónico: +52 + 10 dígitos (sin el 1)
 * - Generar variantes (+52, +521, 10 dígitos) para lookup
 */
import { describe, it, expect } from '@jest/globals';
import { normalizarNumeroE164, variantesNumeroMX } from '../src/utils/whatsapp-multiusuario.js';

describe('Normalización números mexicanos - Formato canónico', () => {

  it('10 dígitos locales → +52 + 10 dígitos', () => {
    const resultado = normalizarNumeroE164('8115556484');
    expect(resultado).toBe('+528115556484');
  });

  it('+52 + 10 dígitos → mismo (canónico)', () => {
    const resultado = normalizarNumeroE164('+528115556484');
    expect(resultado).toBe('+528115556484');
  });

  it('52 + 10 dígitos → +52 + 10 dígitos', () => {
    const resultado = normalizarNumeroE164('528115556484');
    expect(resultado).toBe('+528115556484');
  });

  it('+521 + 10 dígitos (13 total) → +52 + 10 dígitos (elimina el 1)', () => {
    const resultado = normalizarNumeroE164('+5218115556484');
    expect(resultado).toBe('+528115556484');
  });

  it('521 + 10 dígitos (13 total) → +52 + 10 dígitos (elimina el 1)', () => {
    const resultado = normalizarNumeroE164('5218115556484');
    expect(resultado).toBe('+528115556484');
  });

  it('+52 1 10 dígitos (espaciado, 14 total) → +52 + 10 dígitos', () => {
    const resultado = normalizarNumeroE164('+52 1 8115556484');
    expect(resultado).toBe('+528115556484');
  });

  it('Número con espacios y guiones → normalizado', () => {
    const resultado = normalizarNumeroE164('+52-811-555-6484');
    expect(resultado).toBe('+528115556484');
  });

});

describe('variantesNumeroMX - Generar variantes para búsqueda', () => {

  it('Número canónico +528115556484 → [+52..., +521..., 10dig]', () => {
    const variantes = variantesNumeroMX('+528115556484');
    
    expect(variantes).toHaveLength(3);
    expect(variantes).toContain('+528115556484');   // Canónico
    expect(variantes).toContain('+5218115556484');  // Con 1
    expect(variantes).toContain('8115556484');      // 10 dígitos locales
  });

  it('Número con 1 (+5218115556484) → genera mismas variantes', () => {
    const variantes = variantesNumeroMX('+5218115556484');
    
    expect(variantes).toHaveLength(3);
    expect(variantes).toContain('+528115556484');   // Canónico (sin 1)
    expect(variantes).toContain('+5218115556484');  // Con 1
    expect(variantes).toContain('8115556484');      // 10 dígitos
  });

  it('10 dígitos locales → genera variantes', () => {
    const variantes = variantesNumeroMX('8115556484');
    
    expect(variantes).toHaveLength(3);
    expect(variantes).toContain('+528115556484');
    expect(variantes).toContain('+5218115556484');
    expect(variantes).toContain('8115556484');
  });

  it('LID (@lid) → NO genera variantes (retorna [])', () => {
    const variantes = variantesNumeroMX('219502943989980@lid');
    expect(variantes).toEqual([]);
  });

  it('Número USA (+1...) → NO genera variantes MX', () => {
    const variantes = variantesNumeroMX('+15551234567');
    expect(variantes).toEqual([]);
  });

  it('Número vacío → []', () => {
    const variantes = variantesNumeroMX('');
    expect(variantes).toEqual([]);
  });

  it('Número null → []', () => {
    const variantes = variantesNumeroMX(null);
    expect(variantes).toEqual([]);
  });

});

describe('Casos reales del bug reportado', () => {

  it('Usuario guardó 8115556484 → normalizado +528115556484', () => {
    const guardado = normalizarNumeroE164('8115556484');
    expect(guardado).toBe('+528115556484');
  });

  it('WhatsApp entregó 5218115556484 → normalizado +528115556484 (mismo)', () => {
    const entregado = normalizarNumeroE164('5218115556484');
    expect(entregado).toBe('+528115556484');
  });

  it('Ambos normalizados deben matchear', () => {
    const guardado = normalizarNumeroE164('8115556484');
    const entregado = normalizarNumeroE164('5218115556484');
    expect(guardado).toBe(entregado);
  });

  it('Variantes de ambos incluyen formato del otro', () => {
    const variantesGuardado = variantesNumeroMX('8115556484');
    const variantesEntregado = variantesNumeroMX('5218115556484');
    
    // Ambas listas deben contener +528115556484 y +5218115556484
    expect(variantesGuardado).toContain('+528115556484');
    expect(variantesGuardado).toContain('+5218115556484');
    
    expect(variantesEntregado).toContain('+528115556484');
    expect(variantesEntregado).toContain('+5218115556484');
  });

});

describe('Normalización preserva números no-mexicanos', () => {

  it('Número USA +15551234567 → sin cambios', () => {
    const resultado = normalizarNumeroE164('+15551234567');
    expect(resultado).toBe('+15551234567');
  });

  it('Número España +34612345678 → sin cambios', () => {
    const resultado = normalizarNumeroE164('+34612345678');
    expect(resultado).toBe('+34612345678');
  });

  it('LID completo → retorna como está (no normalizable)', () => {
    const resultado = normalizarNumeroE164('219502943989980@lid');
    expect(resultado).toBeNull(); // No es E.164 válido
  });

});
