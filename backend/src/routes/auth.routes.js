import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        email,
        activo: true,
      },
      include: {
        inmobiliaria: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.inmobiliaria.activa) {
      return res.status(403).json({ error: 'Inmobiliaria inactiva' });
    }

    const passwordValid = await bcrypt.compare(password, usuario.password);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { usuarioId: usuario.id, inmobiliariaId: usuario.inmobiliariaId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await prisma.sesion.create({
      data: {
        usuarioId: usuario.id,
        token,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        inmobiliaria: {
          id: usuario.inmobiliaria.id,
          nombre: usuario.inmobiliaria.nombre,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await prisma.sesion.deleteMany({
        where: { token },
      });
    }

    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({
    usuario: req.user,
  });
});

export default router;
