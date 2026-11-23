import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Obtener configuración de la inmobiliaria
router.get('/', async (req, res, next) => {
  try {
    const inmobiliaria = await prisma.inmobiliaria.findUnique({
      where: { id: req.user.inmobiliariaId },
    });

    res.json(inmobiliaria);
  } catch (error) {
    next(error);
  }
});

// Actualizar configuración (solo admin)
router.put('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const {
      nombre,
      razonSocial,
      rfc,
      domicilio,
      telefono,
      emailPrivacidad,
      horario,
      registroProfeco,
      licenciaEstatal,
      leyendaProfeco,
      leyendaNom247,
      permiteCookies,
    } = req.body;

    const inmobiliaria = await prisma.inmobiliaria.update({
      where: { id: req.user.inmobiliariaId },
      data: {
        ...(nombre && { nombre }),
        ...(razonSocial && { razonSocial }),
        ...(rfc !== undefined && { rfc }),
        ...(domicilio !== undefined && { domicilio }),
        ...(telefono && { telefono }),
        ...(emailPrivacidad && { emailPrivacidad }),
        ...(horario !== undefined && { horario }),
        ...(registroProfeco !== undefined && { registroProfeco }),
        ...(licenciaEstatal !== undefined && { licenciaEstatal }),
        ...(leyendaProfeco !== undefined && { leyendaProfeco }),
        ...(leyendaNom247 !== undefined && { leyendaNom247 }),
        ...(permiteCookies !== undefined && { permiteCookies }),
      },
    });

    res.json(inmobiliaria);
  } catch (error) {
    next(error);
  }
});

// Listar usuarios
router.get('/usuarios', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { inmobiliariaId: req.user.inmobiliariaId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { nombre: 'asc' },
    });

    res.json(usuarios);
  } catch (error) {
    next(error);
  }
});

// Crear usuario (solo admin)
router.post('/usuarios', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const bcrypt = (await import('bcryptjs')).default;
    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        inmobiliariaId: req.user.inmobiliariaId,
        nombre,
        email,
        password: passwordHash,
        rol,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
});

export default router;
