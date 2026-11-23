import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { extractYouTubeId, isYouTubeUrl } from '../utils/youtube.js';
import { validateVideoType, validateFileSize } from '../utils/fileValidation.js';

const router = express.Router();

// Configuración de multer para subida de videos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo MP4, WebM, y MOV son aceptados.'));
    }
  }
});

router.use(authenticateToken);
router.use(requireRole('ADMIN', 'SUPERVISOR'));

// Listar videos de una propiedad
router.get('/:propiedadId/videos', async (req, res, next) => {
  try {
    const { propiedadId } = req.params;

    // Verificar que la propiedad pertenece a la inmobiliaria del usuario
    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id: propiedadId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const videos = await prisma.propiedadVideo.findMany({
      where: { propiedadId },
      orderBy: { orden: 'asc' },
    });

    res.json(videos);
  } catch (error) {
    next(error);
  }
});

// Agregar video de YouTube
router.post('/:propiedadId/videos/youtube', async (req, res, next) => {
  try {
    const { propiedadId } = req.params;
    const { url, orden } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL de YouTube es requerida' });
    }

    // Verificar que la propiedad pertenece a la inmobiliaria del usuario
    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id: propiedadId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    // Validar y extraer ID de YouTube
    if (!isYouTubeUrl(url)) {
      return res.status(400).json({ 
        error: 'URL inválida. Solo se aceptan URLs de YouTube (youtube.com/watch, youtu.be, youtube.com/shorts)' 
      });
    }

    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) {
      return res.status(400).json({ error: 'No se pudo extraer el ID del video de YouTube' });
    }

    const video = await prisma.propiedadVideo.create({
      data: {
        propiedadId,
        tipo: 'YOUTUBE',
        youtubeId,
        orden: orden !== undefined ? parseInt(orden) : 0,
      },
    });

    res.status(201).json(video);
  } catch (error) {
    next(error);
  }
});

// Subir video desde archivo
router.post('/:propiedadId/videos/upload', upload.single('video'), async (req, res, next) => {
  try {
    const { propiedadId } = req.params;
    const { orden } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    // Verificar que la propiedad pertenece a la inmobiliaria del usuario
    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id: propiedadId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      // Eliminar archivo subido si la propiedad no existe
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    // Validar tamaño del archivo
    if (!validateFileSize(req.file.size)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'El archivo excede el tamaño máximo de 200 MB' });
    }

    // Validar tipo de archivo usando magic bytes
    const { valid, detectedType } = await validateVideoType(req.file.path);
    if (!valid) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        error: 'Tipo de archivo inválido. El archivo no es un video MP4, WebM, o MOV válido.' 
      });
    }

    // Generar URL relativa
    const archivoUrl = `/uploads/videos/${req.file.filename}`;

    const video = await prisma.propiedadVideo.create({
      data: {
        propiedadId,
        tipo: 'ARCHIVO',
        archivoUrl,
        orden: orden !== undefined ? parseInt(orden) : 0,
      },
    });

    res.status(201).json(video);
  } catch (error) {
    // Limpiar archivo en caso de error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
});

// Actualizar orden de video
router.patch('/:propiedadId/videos/:videoId/orden', async (req, res, next) => {
  try {
    const { propiedadId, videoId } = req.params;
    const { orden } = req.body;

    if (orden === undefined) {
      return res.status(400).json({ error: 'Orden es requerido' });
    }

    // Verificar que la propiedad pertenece a la inmobiliaria del usuario
    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id: propiedadId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const video = await prisma.propiedadVideo.update({
      where: { id: videoId },
      data: { orden: parseInt(orden) },
    });

    res.json(video);
  } catch (error) {
    next(error);
  }
});

// Eliminar video
router.delete('/:propiedadId/videos/:videoId', async (req, res, next) => {
  try {
    const { propiedadId, videoId } = req.params;

    // Verificar que la propiedad pertenece a la inmobiliaria del usuario
    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id: propiedadId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const video = await prisma.propiedadVideo.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    // Si es un archivo, eliminarlo del disco
    if (video.tipo === 'ARCHIVO' && video.archivoUrl) {
      const filePath = path.join(process.cwd(), video.archivoUrl);
      await fs.unlink(filePath).catch(() => {});
    }

    await prisma.propiedadVideo.delete({
      where: { id: videoId },
    });

    res.json({ message: 'Video eliminado' });
  } catch (error) {
    next(error);
  }
});

export default router;
