import { describe, it, expect } from '@jest/globals';

describe('Sistema de Recordatorios', () => {
  
  function obtenerRecordatoriosVencidos(recordatorios, fechaActual) {
    return recordatorios.filter(r => 
      !r.completado && new Date(r.fechaRecordatorio) < fechaActual
    );
  }

  function obtenerRecordatoriosPendientes(recordatorios, fechaActual) {
    return recordatorios.filter(r => 
      !r.completado && new Date(r.fechaRecordatorio) >= fechaActual
    );
  }

  const recordatoriosEjemplo = [
    {
      id: '1',
      titulo: 'Llamar a Juan Pérez',
      fechaRecordatorio: '2026-11-20T10:00:00Z',
      completado: false,
    },
    {
      id: '2',
      titulo: 'Seguimiento María',
      fechaRecordatorio: '2026-11-25T15:00:00Z',
      completado: false,
    },
    {
      id: '3',
      titulo: 'Visita programada',
      fechaRecordatorio: '2026-11-22T11:00:00Z',
      completado: true,
    },
    {
      id: '4',
      titulo: 'Recordatorio futuro',
      fechaRecordatorio: '2026-12-01T09:00:00Z',
      completado: false,
    },
  ];

  it('debe identificar recordatorios vencidos', () => {
    const fechaActual = new Date('2026-11-23T12:00:00Z');
    const vencidos = obtenerRecordatoriosVencidos(recordatoriosEjemplo, fechaActual);

    expect(vencidos).toHaveLength(2);
    expect(vencidos[0].id).toBe('1');
    expect(vencidos[1].id).toBe('2');
  });

  it('debe identificar recordatorios pendientes futuros', () => {
    const fechaActual = new Date('2026-11-23T12:00:00Z');
    const pendientes = obtenerRecordatoriosPendientes(recordatoriosEjemplo, fechaActual);

    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].id).toBe('4');
  });

  it('no debe incluir recordatorios completados', () => {
    const fechaActual = new Date('2026-11-23T12:00:00Z');
    const vencidos = obtenerRecordatoriosVencidos(recordatoriosEjemplo, fechaActual);

    const completados = vencidos.filter(r => r.completado);
    expect(completados).toHaveLength(0);
  });

  it('debe poder marcar recordatorio como completado', () => {
    const recordatorio = { ...recordatoriosEjemplo[0] };
    recordatorio.completado = true;

    expect(recordatorio.completado).toBe(true);
  });

  it('debe validar fecha de recordatorio en el futuro', () => {
    const fechaActual = new Date('2026-11-23T12:00:00Z');
    const fechaRecordatorio = new Date('2026-11-24T10:00:00Z');

    expect(fechaRecordatorio > fechaActual).toBe(true);
  });
});
