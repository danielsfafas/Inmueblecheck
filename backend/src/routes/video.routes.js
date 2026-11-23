import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generarVideoPropiedad } from '../services/video.service.js';

const router = express.Router();

router.use(authenticateToken);

// Generar video de una propiedad
router.post('/propiedades/:id/generar', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id,
        inmobiliariaId: req.user.inmobiliariaId,
      },
      include: {
        inmobiliaria: true,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const resultado = await generarVideoPropiedad(propiedad, propiedad.inmobiliaria);

    if (!resultado.success) {
      return res.status(500).json({
        error: resultado.error,
        simulado: resultado.simulado || false,
        message: 'No se pudo generar el video. Se requiere ffmpeg instalado en el servidor.',
      });
    }

    // Actualizar la propiedad con la URL del video
    await prisma.propiedad.update({
      where: { id },
      data: { videoUrl: resultado.url },
    });

    res.json({
      success: true,
      video: resultado,
      message: 'Video generado exitosamente',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
