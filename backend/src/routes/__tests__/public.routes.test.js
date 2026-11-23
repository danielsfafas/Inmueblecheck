/**
 * @jest-environment node
 */

import request from 'supertest';
import express from 'express';
import publicRoutes from '../public.routes.js';
import { prisma } from '../../index.js';

const app = express();
app.use(express.json());
app.use('/public', publicRoutes);

// Mock de Prisma
jest.mock('../../index.js', () => ({
  prisma: {
    propiedad: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Public Routes - Smoke Tests', () => {
  describe('GET /public/propiedades', () => {
    it('debe devolver propiedades disponibles sin inmobiliariaId', async () => {
      const mockPropiedades = [
        {
          id: '1',
          titulo: 'Casa de prueba',
          tipo: 'VENTA',
          precio: 1500000,
          estadoPropiedad: 'DISPONIBLE',
          colonia: 'Centro',
          ciudad: 'Tepeapulco',
          recamaras: 3,
          banos: 2,
          estacionamientos: 1,
          fotos: [],
        },
      ];

      prisma.propiedad.findMany.mockResolvedValue(mockPropiedades);
      prisma.propiedad.count.mockResolvedValue(1);

      const response = await request(app).get('/public/propiedades');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('propiedades');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.propiedades)).toBe(true);
    });

    it('debe filtrar por tipo de operación', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/public/propiedades')
        .query({ tipo: 'VENTA' });

      expect(response.status).toBe(200);
      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tipo: 'VENTA',
            estadoPropiedad: 'DISPONIBLE',
          }),
        })
      );
    });

    it('debe filtrar por rango de precio', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/public/propiedades')
        .query({ precioMin: '1000000', precioMax: '2000000' });

      expect(response.status).toBe(200);
      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            precio: {
              gte: 1000000,
              lte: 2000000,
            },
          }),
        })
      );
    });

    it('debe devolver array vacío cuando no hay propiedades', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      const response = await request(app).get('/public/propiedades');

      expect(response.status).toBe(200);
      expect(response.body.propiedades).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  describe('GET /public/propiedades/:id', () => {
    it('debe devolver una propiedad por ID', async () => {
      const mockPropiedad = {
        id: '1',
        titulo: 'Casa de prueba',
        descripcion: 'Descripción de prueba',
        tipo: 'VENTA',
        precio: 1500000,
        estadoPropiedad: 'DISPONIBLE',
        inmobiliaria: {
          nombre: 'Inmobiliaria Test',
          telefono: '1234567890',
          email: 'test@test.com',
          horario: 'L-V 9-18',
        },
      };

      prisma.propiedad.findUnique.mockResolvedValue(mockPropiedad);
      prisma.propiedad.update.mockResolvedValue(mockPropiedad);

      const response = await request(app).get('/public/propiedades/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('titulo');
      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { vistas: { increment: 1 } },
        })
      );
    });

    it('debe devolver 404 si la propiedad no existe', async () => {
      prisma.propiedad.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/public/propiedades/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /public/propiedades/:id/whatsapp-click', () => {
    it('debe incrementar contador de clics de WhatsApp', async () => {
      prisma.propiedad.update.mockResolvedValue({});

      const response = await request(app).post('/public/propiedades/1/whatsapp-click');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { clicsWhatsapp: { increment: 1 } },
        })
      );
    });
  });
});
