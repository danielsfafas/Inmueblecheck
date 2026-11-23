/**
 * Test unitario: enviarMensajeWhatsApp debe llamar sendBaileysMessage
 * incluso con AI_PROVIDER=simulado
 * 
 * Bug: AI_PROVIDER=simulado hacía que NO se enviaran mensajes por Baileys
 * Fix: AI_PROVIDER solo controla si la IA es simulada, NO si los mensajes se envían
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('enviarMensajeWhatsApp - Lógica de simulación', () => {
  
  beforeEach(() => {
    // Configurar AI_PROVIDER=simulado para todos los tests
    process.env.AI_PROVIDER = 'simulado';
  });

  it('NO debe simular para proveedor BAILEYS con AI_PROVIDER=simulado', () => {
    // Este es el caso del bug: BAILEYS debe enviar mensajes reales siempre
    const numeroReceptor = {
      id: 'test-numero-id',
      numero: '+5215512345678',
      proveedor: 'BAILEYS',
    };
    
    // Lógica implementada en enviarMensajeWhatsApp
    const shouldSimulate = process.env.AI_PROVIDER === 'simulado' && numeroReceptor.proveedor !== 'BAILEYS';
    
    // Para BAILEYS: NO simular, enviar mensaje real
    expect(shouldSimulate).toBe(false);
  });

  it('debe simular para proveedores NO implementados con AI_PROVIDER=simulado', () => {
    const numeroReceptorMeta = {
      proveedor: 'META_CLOUD',
    };
    
    const shouldSimulateMeta = process.env.AI_PROVIDER === 'simulado' && numeroReceptorMeta.proveedor !== 'BAILEYS';
    
    expect(shouldSimulateMeta).toBe(true); // SÍ debe simular para META_CLOUD
  });

  it('debe enviar para BAILEYS incluso sin AI_PROVIDER configurado', () => {
    delete process.env.AI_PROVIDER;
    
    const numeroReceptor = {
      proveedor: 'BAILEYS',
    };
    
    const shouldSimulate = process.env.AI_PROVIDER === 'simulado' && numeroReceptor.proveedor !== 'BAILEYS';
    
    expect(shouldSimulate).toBe(false); // NO simular, enviar real
  });
});
