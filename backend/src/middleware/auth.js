import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.usuarioId },
      include: {
        inmobiliaria: true,
      },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }

    if (!usuario.inmobiliaria.activa) {
      return res.status(403).json({ error: 'Inmobiliaria inactiva' });
    }

    req.user = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      inmobiliariaId: usuario.inmobiliariaId,
      inmobiliaria: usuario.inmobiliaria,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    next(error);
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
};
