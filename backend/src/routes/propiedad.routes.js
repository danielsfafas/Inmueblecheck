import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Listar propiedades
router.get('/', async (req, res, next) => {
  try {
    const { estado, tipo } = req.query;

    const where = {
      inmobiliariaId: req.user.inmobiliariaId,
    };

    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;

    const propiedades = await prisma.propiedad.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(propiedades);
  } catch (error) {
    next(error);
  }
});

// Obtener una propiedad
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json(propiedad);
  } catch (error) {
    next(error);
  }
});

// Crear propiedad
router.post('/', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const {
      titulo,
      descripcion,
      tipo,
      precio,
      colonia,
      ciudad,
      estado,
      codigoPostal,
      latitud,
      longitud,
      metrosTerreno,
      metrosConstruccion,
      recamaras,
      banos,
      estacionamientos,
      aceptaContado,
      aceptaBancario,
      aceptaInfonavit,
      aceptaFovissste,
      fotos,
      videoUrl,
    } = req.body;

    // Generar coordenadas aproximadas (añadiendo pequeña variación)
    const latitudAprox = latitud ? parseFloat(latitud) + (Math.random() - 0.5) * 0.01 : null;
    const longitudAprox = longitud ? parseFloat(longitud) + (Math.random() - 0.5) * 0.01 : null;

    const propiedad = await prisma.propiedad.create({
      data: {
        inmobiliariaId: req.user.inmobiliariaId,
        titulo,
        descripcion,
        tipo,
        precio: parseFloat(precio),
        colonia,
        ciudad,
        estado,
        codigoPostal,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        latitudAprox,
        longitudAprox,
        metrosTerreno: metrosTerreno ? parseFloat(metrosTerreno) : null,
        metrosConstruccion: parseFloat(metrosConstruccion),
        recamaras: parseInt(recamaras),
        banos: parseInt(banos),
        estacionamientos: parseInt(estacionamientos) || 0,
        aceptaContado: aceptaContado !== false,
        aceptaBancario: aceptaBancario === true,
        aceptaInfonavit: aceptaInfonavit === true,
        aceptaFovissste: aceptaFovissste === true,
        fotos: fotos || [],
        videoUrl,
      },
    });

    res.status(201).json(propiedad);
  } catch (error) {
    next(error);
  }
});

// Actualizar propiedad
router.put('/:id', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const propiedadExistente = await prisma.propiedad.findFirst({
      where: {
        id,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedadExistente) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const propiedad = await prisma.propiedad.update({
      where: { id },
      data: req.body,
    });

    res.json(propiedad);
  } catch (error) {
    next(error);
  }
});

// Eliminar propiedad
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    await prisma.propiedad.delete({
      where: { id },
    });

    res.json({ message: 'Propiedad eliminada' });
  } catch (error) {
    next(error);
  }
});

export default router;
