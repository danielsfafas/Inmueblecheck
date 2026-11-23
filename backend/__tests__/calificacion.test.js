import { describe, it, expect } from '@jest/globals';

describe('Sistema de Calificación de Prospectos', () => {
  
  function calcularCalificacion({ presupuesto, creditoPreaprobado, formaPago }) {
    const presupuestoNum = presupuesto ? parseFloat(presupuesto) : 0;
    const creditoNum = creditoPreaprobado ? parseFloat(creditoPreaprobado) : 0;

    if (presupuestoNum >= 1000000 || creditoNum >= 800000) {
      return 'CALIENTE';
    }

    if (presupuestoNum >= 500000 || creditoNum >= 400000) {
      return 'TIBIO';
    }

    return 'FRIO';
  }

  it('debe calificar como CALIENTE con presupuesto >= 1M', () => {
    const resultado = calcularCalificacion({
      presupuesto: 1500000,
      creditoPreaprobado: null,
      formaPago: 'Contado',
    });
    
    expect(resultado).toBe('CALIENTE');
  });

  it('debe calificar como CALIENTE con crédito >= 800K', () => {
    const resultado = calcularCalificacion({
      presupuesto: 500000,
      creditoPreaprobado: 850000,
      formaPago: 'Crédito bancario',
    });
    
    expect(resultado).toBe('CALIENTE');
  });

  it('debe calificar como TIBIO con presupuesto entre 500K y 1M', () => {
    const resultado = calcularCalificacion({
      presupuesto: 750000,
      creditoPreaprobado: null,
      formaPago: 'Infonavit',
    });
    
    expect(resultado).toBe('TIBIO');
  });

  it('debe calificar como TIBIO con crédito entre 400K y 800K', () => {
    const resultado = calcularCalificacion({
      presupuesto: 200000,
      creditoPreaprobado: 600000,
      formaPago: 'Crédito bancario',
    });
    
    expect(resultado).toBe('TIBIO');
  });

  it('debe calificar como FRIO con presupuesto < 500K', () => {
    const resultado = calcularCalificacion({
      presupuesto: 300000,
      creditoPreaprobado: null,
      formaPago: 'Contado',
    });
    
    expect(resultado).toBe('FRIO');
  });

  it('debe calificar como FRIO sin presupuesto ni crédito', () => {
    const resultado = calcularCalificacion({
      presupuesto: null,
      creditoPreaprobado: null,
      formaPago: 'Renta',
    });
    
    expect(resultado).toBe('FRIO');
  });
});
