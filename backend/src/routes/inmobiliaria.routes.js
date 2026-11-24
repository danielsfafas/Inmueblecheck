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
        telefonoWhatsapp: true,
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

// Actualizar teléfono WhatsApp de usuario (solo admin/owner)
router.patch('/usuarios/:id', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { telefonoWhatsapp } = req.body;
    
    // Solo permitir actualizar telefonoWhatsapp
    if (telefonoWhatsapp === undefined) {
      return res.status(400).json({ error: 'telefonoWhatsapp requerido' });
    }

    // Validar formato E.164-ish (opcional: +, luego dígitos, 10-15 dígitos)
    if (telefonoWhatsapp && !/^\+?[0-9]{10,15}$/.test(telefonoWhatsapp)) {
      return res.status(400).json({ 
        error: 'Formato inválido. Use formato internacional: +5215512345678 o 5512345678' 
      });
    }

    // Verificar que el usuario pertenece a la misma inmobiliaria (scoping)
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
      select: { inmobiliariaId: true },
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuarioExistente.inmobiliariaId !== req.user.inmobiliariaId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Actualizar solo telefonoWhatsapp
    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: { telefonoWhatsapp },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        telefonoWhatsapp: true,
        createdAt: true,
      },
    });

    res.json(usuarioActualizado);
  } catch (error) {
    next(error);
  }
});

export default router;
