import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Listar consentimientos
router.get('/', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { prospectoId, tipo } = req.query;

    const where = {
      inmobiliariaId: req.user.inmobiliariaId,
    };

    if (prospectoId) where.prospectoId = prospectoId;
    if (tipo) where.tipo = tipo;

    const consentimientos = await prisma.consentimiento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(consentimientos);
  } catch (error) {
    next(error);
  }
});

// Registrar consentimiento
router.post('/', async (req, res, next) => {
  try {
    const {
      prospectoId,
      titular,
      tipo,
      accion,
      versionDocumento,
      textoHash,
      canal,
    } = req.body;

    if (!titular || !tipo || !accion || !versionDocumento) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const consentimiento = await prisma.consentimiento.create({
      data: {
        inmobiliariaId: req.user.inmobiliariaId,
        prospectoId: prospectoId || null,
        titular,
        tipo,
        accion,
        versionDocumento,
        textoHash: textoHash || '',
        canal: canal || 'web',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.status(201).json(consentimiento);
  } catch (error) {
    next(error);
  }
});

export default router;
