/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';

describe('Public Routes - Validación de lógica de negocio', () => {
  
  describe('Función de calificación de prospectos desde rutas públicas', () => {
    function calcularCalificacion({ presupuesto, creditoPreaprobado }) {
      const presupuestoNum = presupuesto ? parseFloat(presupuesto) : 0;
      const creditoNum = creditoPreaprobado ? parseFloat(creditoPreaprobado) : 0;

      // CALIENTE: Tiene presupuesto > 1M o crédito preaprobado > 800K
      if (presupuestoNum >= 1000000 || creditoNum >= 800000) {
        return 'CALIENTE';
      }

      // TIBIO: Tiene presupuesto > 500K o crédito > 400K
      if (presupuestoNum >= 500000 || creditoNum >= 400000) {
        return 'TIBIO';
      }

      // FRÍO: Resto
      return 'FRIO';
    }

    it('debe calificar como CALIENTE con presupuesto alto', () => {
      const resultado = calcularCalificacion({
        presupuesto: 1500000,
        creditoPreaprobado: null,
      });
      expect(resultado).toBe('CALIENTE');
    });

    it('debe calificar como TIBIO con presupuesto medio', () => {
      const resultado = calcularCalificacion({
        presupuesto: 700000,
        creditoPreaprobado: null,
      });
      expect(resultado).toBe('TIBIO');
    });

    it('debe calificar como FRIO con presupuesto bajo', () => {
      const resultado = calcularCalificacion({
        presupuesto: 300000,
        creditoPreaprobado: null,
      });
      expect(resultado).toBe('FRIO');
    });
  });

  describe('Validación de slugs', () => {
    function slugValido(slug) {
      return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    }

    it('debe validar slug correcto', () => {
      expect(slugValido('casas-hidalgo')).toBe(true);
      expect(slugValido('inmobiliaria-123')).toBe(true);
    });

    it('debe rechazar slug con mayúsculas', () => {
      expect(slugValido('Casas-Hidalgo')).toBe(false);
    });

    it('debe rechazar slug con espacios', () => {
      expect(slugValido('casas hidalgo')).toBe(false);
    });

    it('debe rechazar slug con caracteres especiales', () => {
      expect(slugValido('casas_hidalgo')).toBe(false);
      expect(slugValido('casas@hidalgo')).toBe(false);
    });
  });

  describe('Validación de filtros de precio', () => {
    function aplicarFiltroPrecio(propiedades, precioMin, precioMax) {
      return propiedades.filter(p => {
        if (precioMin && p.precio < parseFloat(precioMin)) return false;
        if (precioMax && p.precio > parseFloat(precioMax)) return false;
        return true;
      });
    }

    const propiedadesMock = [
      { id: '1', precio: 500000 },
      { id: '2', precio: 1000000 },
      { id: '3', precio: 2000000 },
    ];

    it('debe filtrar por precio mínimo', () => {
      const resultado = aplicarFiltroPrecio(propiedadesMock, '1000000', null);
      expect(resultado).toHaveLength(2);
      expect(resultado.map(p => p.id)).toEqual(['2', '3']);
    });

    it('debe filtrar por precio máximo', () => {
      const resultado = aplicarFiltroPrecio(propiedadesMock, null, '1000000');
      expect(resultado).toHaveLength(2);
      expect(resultado.map(p => p.id)).toEqual(['1', '2']);
    });

    it('debe filtrar por rango de precio', () => {
      const resultado = aplicarFiltroPrecio(propiedadesMock, '500000', '1500000');
      expect(resultado).toHaveLength(2);
      expect(resultado.map(p => p.id)).toEqual(['1', '2']);
    });
  });
});
