import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN', 'SUPERVISOR'));

// Configuración de multer para fotos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'propiedades');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `foto-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPG, PNG o WebP'));
    }
  }
});

// Validar tipo de imagen por magic bytes
async function validateImageType(filePath) {
  const buffer = Buffer.alloc(12);
  const fileHandle = await fs.open(filePath, 'r');
  
  try {
    await fileHandle.read(buffer, 0, 12, 0);
    
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'jpeg';
    }
    
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && 
        buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'png';
    }
    
    // WebP: RIFF ... WEBP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && 
        buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 &&
        buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'webp';
    }
    
    return null;
  } finally {
    await fileHandle.close();
  }
}

// Subir fotos a propiedad
router.post('/:propiedadId/fotos', upload.array('fotos', 20), async (req, res, next) => {
  try {
    const { propiedadId } = req.params;

    // Verificar que la propiedad existe y pertenece al tenant
    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id: propiedadId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      // Limpiar archivos subidos
      if (req.files) {
        for (const file of req.files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    // Validar magic bytes de cada archivo
    const fotosValidas = [];
    for (const file of req.files) {
      const tipoReal = await validateImageType(file.path);
      
      if (!tipoReal) {
        await fs.unlink(file.path).catch(() => {});
        continue; // Ignorar archivos inválidos
      }
      
      fotosValidas.push(`/uploads/propiedades/${file.filename}`);
    }

    if (fotosValidas.length === 0) {
      return res.status(400).json({ error: 'No se subieron fotos válidas' });
    }

    // Agregar fotos al array existente
    const fotosActuales = propiedad.fotos || [];
    const fotosActualizadas = [...fotosActuales, ...fotosValidas];

    const propiedadActualizada = await prisma.propiedad.update({
      where: { id: propiedadId },
      data: { fotos: fotosActualizadas },
    });

    res.json({
      message: `${fotosValidas.length} foto(s) subida(s)`,
      fotos: fotosActualizadas,
      propiedad: propiedadActualizada,
    });
  } catch (error) {
    // Limpiar archivos en caso de error
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }
    next(error);
  }
});

// Reordenar fotos
router.patch('/:propiedadId/fotos/orden', async (req, res, next) => {
  try {
    const { propiedadId } = req.params;
    const { fotos } = req.body;

    if (!Array.isArray(fotos)) {
      return res.status(400).json({ error: 'Se requiere un array de fotos' });
    }

    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id: propiedadId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const propiedadActualizada = await prisma.propiedad.update({
      where: { id: propiedadId },
      data: { fotos },
    });

    res.json(propiedadActualizada);
  } catch (error) {
    next(error);
  }
});

// Eliminar foto
router.delete('/:propiedadId/fotos', async (req, res, next) => {
  try {
    const { propiedadId } = req.params;
    const { fotoUrl } = req.body;

    if (!fotoUrl) {
      return res.status(400).json({ error: 'Se requiere fotoUrl' });
    }

    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id: propiedadId,
        inmobiliariaId: req.user.inmobiliariaId,
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const fotosActualizadas = (propiedad.fotos || []).filter(f => f !== fotoUrl);

    // Eliminar archivo físico si es local
    if (fotoUrl.startsWith('/uploads/propiedades/')) {
      const filename = path.basename(fotoUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'propiedades', filename);
      await fs.unlink(filePath).catch(() => {});
    }

    const propiedadActualizada = await prisma.propiedad.update({
      where: { id: propiedadId },
      data: { fotos: fotosActualizadas },
    });

    res.json(propiedadActualizada);
  } catch (error) {
    next(error);
  }
});

export default router;
