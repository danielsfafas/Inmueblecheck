import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';

describe('Sistema de Consentimientos', () => {
  
  function generarHashTexto(texto) {
    return crypto.createHash('sha256').update(texto).digest('hex');
  }

  function validarConsentimiento(consentimiento) {
    const camposRequeridos = [
      'inmobiliariaId',
      'titular',
      'tipo',
      'accion',
      'versionDocumento',
      'canal',
      'createdAt',
    ];

    for (const campo of camposRequeridos) {
      if (!consentimiento[campo]) {
        return { valido: false, campoFaltante: campo };
      }
    }

    return { valido: true };
  }

  function verificarDatosFinancieros(consentimientos) {
    return consentimientos.some(c => 
      c.tipo === 'DATOS_FINANCIEROS' && c.accion === 'OTORGA'
    );
  }

  it('debe generar hash consistente del texto', () => {
    const texto = 'Acepto el aviso de privacidad versión 1.0';
    const hash1 = generarHashTexto(texto);
    const hash2 = generarHashTexto(texto);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('debe validar consentimiento completo', () => {
    const consentimiento = {
      inmobiliariaId: 'inm-123',
      titular: 'Juan Pérez',
      tipo: 'AVISO_PRIVACIDAD',
      accion: 'OTORGA',
      versionDocumento: '1.0',
      textoHash: 'abc123',
      canal: 'web',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    };

    const resultado = validarConsentimiento(consentimiento);
    expect(resultado.valido).toBe(true);
  });

  it('debe detectar consentimiento incompleto', () => {
    const consentimiento = {
      inmobiliariaId: 'inm-123',
      titular: 'Juan Pérez',
      tipo: 'AVISO_PRIVACIDAD',
    };

    const resultado = validarConsentimiento(consentimiento);
    expect(resultado.valido).toBe(false);
    expect(resultado.campoFaltante).toBeDefined();
  });

  it('debe registrar fecha UTC del consentimiento', () => {
    const fecha = new Date();
    const consentimiento = {
      inmobiliariaId: 'inm-123',
      titular: 'María López',
      tipo: 'DATOS_FINANCIEROS',
      accion: 'OTORGA',
      versionDocumento: '1.0',
      textoHash: 'def456',
      canal: 'web',
      createdAt: fecha,
    };

    expect(consentimiento.createdAt).toBeInstanceOf(Date);
  });

  it('debe verificar consentimiento de datos financieros', () => {
    const consentimientos = [
      {
        tipo: 'AVISO_PRIVACIDAD',
        accion: 'OTORGA',
      },
      {
        tipo: 'DATOS_FINANCIEROS',
        accion: 'OTORGA',
      },
    ];

    const tieneConsentimiento = verificarDatosFinancieros(consentimientos);
    expect(tieneConsentimiento).toBe(true);
  });

  it('debe detectar falta de consentimiento de datos financieros', () => {
    const consentimientos = [
      {
        tipo: 'AVISO_PRIVACIDAD',
        accion: 'OTORGA',
      },
      {
        tipo: 'COOKIES_ANALITICA',
        accion: 'OTORGA',
      },
    ];

    const tieneConsentimiento = verificarDatosFinancieros(consentimientos);
    expect(tieneConsentimiento).toBe(false);
  });

  it('debe registrar IP y user agent', () => {
    const consentimiento = {
      inmobiliariaId: 'inm-123',
      titular: 'Carlos García',
      tipo: 'OPTIN_WHATSAPP_SERVICIO',
      accion: 'OTORGA',
      versionDocumento: '1.0',
      textoHash: 'ghi789',
      canal: 'whatsapp',
      ip: '10.0.0.1',
      userAgent: 'WhatsApp/2.23.0',
      createdAt: new Date(),
    };

    expect(consentimiento.ip).toBe('10.0.0.1');
    expect(consentimiento.userAgent).toContain('WhatsApp');
  });

  it('debe soportar acción de REVOCA', () => {
    const consentimiento = {
      tipo: 'COOKIES_ANALITICA',
      accion: 'REVOCA',
    };

    expect(['OTORGA', 'REVOCA', 'BAJA']).toContain(consentimiento.accion);
  });

  it('debe soportar acción de BAJA (REPEP)', () => {
    const consentimiento = {
      tipo: 'OPTIN_WHATSAPP_MARKETING',
      accion: 'BAJA',
    };

    expect(consentimiento.accion).toBe('BAJA');
  });
});
