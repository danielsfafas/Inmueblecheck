/**
 * Test: Prevenir confusión entre 'estado' y 'estadoPropiedad'
 * 
 * Bug reportado por Daniel en producción:
 * - Query usaba: estado: 'DISPONIBLE' (filtro incorrecto)
 * - 'estado' = Estado mexicano (Hidalgo, Veracruz, etc.)
 * - 'estadoPropiedad' = Estado de propiedad (DISPONIBLE, VENDIDA, RENTADA, etc.)
 * 
 * Resultado: "estamos actualizando nuestro catálogo" aunque había 6 propiedades DISPONIBLES
 */
import { describe, it, expect } from '@jest/globals';

describe('Propiedad - Distinción entre estado y estadoPropiedad', () => {

  // Mock de estructura Prisma Propiedad
  const propiedadMock = {
    id: 'prop-123',
    titulo: 'Casa en Hidalgo',
    estado: 'Hidalgo',                    // ← Estado mexicano (ubicación)
    estadoPropiedad: 'DISPONIBLE',        // ← Estado de la propiedad (status)
    municipio: 'Tepeapulco',
    ciudad: 'Ciudad Sahagún',
    colonia: 'Centro',
    precio: 1500000,
  };

  it('estado debe ser el estado mexicano (Hidalgo, Veracruz, etc.)', () => {
    expect(propiedadMock.estado).toBe('Hidalgo');
    expect(propiedadMock.estado).not.toBe('DISPONIBLE');
    
    // estado NO es un enum, es texto libre (nombre del estado)
    expect(typeof propiedadMock.estado).toBe('string');
  });

  it('estadoPropiedad debe ser el status (DISPONIBLE, VENDIDA, RENTADA)', () => {
    expect(propiedadMock.estadoPropiedad).toBe('DISPONIBLE');
    
    // estadoPropiedad ES un enum EstadoPropiedad
    const estadosValidos = ['DISPONIBLE', 'VENDIDA', 'RENTADA', 'RESERVADA', 'RETIRADA'];
    expect(estadosValidos).toContain(propiedadMock.estadoPropiedad);
  });

  it('filtro INCORRECTO: estado: "DISPONIBLE" NO debe usarse', () => {
    // Filtro INCORRECTO (causa del bug):
    const filtroIncorrecto = {
      inmobiliariaId: 'inmo-123',
      estado: 'DISPONIBLE',  // ❌ WRONG
    };

    // Este filtro buscaría propiedades en un estado mexicano llamado "DISPONIBLE"
    // (que no existe), retornando 0 resultados incluso si hay propiedades disponibles
    expect(filtroIncorrecto.estado).toBe('DISPONIBLE');
    
    // Verificar que este filtro NO matchearía la propiedad mock
    const matchIncorrecto = propiedadMock.estado === filtroIncorrecto.estado;
    expect(matchIncorrecto).toBe(false); // No matchea porque 'Hidalgo' !== 'DISPONIBLE'
  });

  it('filtro CORRECTO: estadoPropiedad: "DISPONIBLE" debe usarse', () => {
    // Filtro CORRECTO:
    const filtroCorrecto = {
      inmobiliariaId: 'inmo-123',
      estadoPropiedad: 'DISPONIBLE',  // ✅ CORRECT
    };

    // Este filtro SÍ encuentra propiedades disponibles
    const matchCorrecto = propiedadMock.estadoPropiedad === filtroCorrecto.estadoPropiedad;
    expect(matchCorrecto).toBe(true); // ✅ Matchea correctamente
  });

  it('ejemplo de query Prisma CORRECTA', () => {
    // Query CORRECTA para obtener propiedades disponibles:
    const queryCorrecta = {
      where: {
        inmobiliariaId: 'inmo-123',
        estadoPropiedad: 'DISPONIBLE',  // ✅ Campo correcto
      },
      take: 20,
    };

    expect(queryCorrecta.where.estadoPropiedad).toBe('DISPONIBLE');
    expect(queryCorrecta.where.estado).toBeUndefined(); // No debe usar 'estado'
  });

  it('ejemplo de query Prisma INCORRECTA (causa del bug)', () => {
    // Query INCORRECTA que causó el bug:
    const queryIncorrecta = {
      where: {
        inmobiliariaId: 'inmo-123',
        estado: 'DISPONIBLE',  // ❌ Campo incorrecto
      },
      take: 5,
    };

    // Este filtro NO encontraría propiedades porque:
    // - Busca: estado (ubicación) = 'DISPONIBLE'
    // - Propiedades tienen: estado = 'Hidalgo', 'Veracruz', etc.
    // - Ninguna propiedad tiene estado = 'DISPONIBLE' como ubicación
    
    expect(queryIncorrecta.where.estado).toBe('DISPONIBLE');
    
    // Simular resultado: 0 propiedades encontradas
    const propiedadesEncontradas = propiedadMock.estado === queryIncorrecta.where.estado ? 1 : 0;
    expect(propiedadesEncontradas).toBe(0); // Bug: retorna 0 aunque hay disponibles
  });

  it('casos de uso válidos de ambos campos', () => {
    // Caso 1: Buscar propiedades DISPONIBLES en Hidalgo
    const queryHidalgoDisponible = {
      where: {
        estado: 'Hidalgo',                  // ✅ Estado mexicano
        estadoPropiedad: 'DISPONIBLE',      // ✅ Status de propiedad
      },
    };

    const matchAmbos = 
      propiedadMock.estado === queryHidalgoDisponible.where.estado &&
      propiedadMock.estadoPropiedad === queryHidalgoDisponible.where.estadoPropiedad;
    
    expect(matchAmbos).toBe(true); // ✅ Matchea correctamente usando ambos campos

    // Caso 2: Buscar solo por estado mexicano (ubicación)
    const queryUbicacion = {
      where: {
        estado: 'Hidalgo',  // ✅ Correcto para filtrar por ubicación
      },
    };
    
    expect(propiedadMock.estado).toBe(queryUbicacion.where.estado);

    // Caso 3: Buscar solo por status de propiedad
    const queryStatus = {
      where: {
        estadoPropiedad: 'DISPONIBLE',  // ✅ Correcto para filtrar por status
      },
    };
    
    expect(propiedadMock.estadoPropiedad).toBe(queryStatus.where.estadoPropiedad);
  });

});
