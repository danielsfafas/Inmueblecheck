import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { normalizarNumeroE164, enmascarCredenciales } from '../utils/whatsapp-multiusuario.js';

const router = express.Router();

router.use(authenticateToken);

// Obtener números WhatsApp del usuario
router.get('/numeros', async (req, res, next) => {
  try {
    const numeros = await prisma.numeroWhatsapp.findMany({
      where: {
        usuarioId: req.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enmascarar credenciales sensibles
    const numerosSeguros = numeros.map(enmascarCredenciales);

    res.json(numerosSeguros);
  } catch (error) {
    next(error);
  }
});

// Crear/Conectar nuevo número WhatsApp
router.post('/numeros', async (req, res, next) => {
  try {
    const { nombre, numero, proveedor, phoneNumberId, accessToken, sessionData } = req.body;

    if (!nombre || !numero || !proveedor) {
      return res.status(400).json({ error: 'nombre, numero y proveedor son obligatorios' });
    }

    // Normalizar número a formato E.164
    const numeroNormalizado = normalizarNumeroE164(numero);

    if (!numeroNormalizado) {
      return res.status(400).json({ error: 'Número de teléfono inválido' });
    }

    // Verificar que el número no esté ya registrado
    const existente = await prisma.numeroWhatsapp.findUnique({
      where: { numero: numeroNormalizado },
    });

    if (existente) {
      return res.status(400).json({ error: 'Este número ya está registrado' });
    }

    // Validar proveedor
    const proveedoresValidos = ['META_CLOUD', 'WHATSAPP_WEB_JS', 'BAILEYS', 'TWILIO'];
    if (!proveedoresValidos.includes(proveedor)) {
      return res.status(400).json({ error: 'Proveedor no válido' });
    }

    // Validar credenciales según proveedor
    if (proveedor === 'META_CLOUD' && (!phoneNumberId || !accessToken)) {
      return res.status(400).json({ error: 'META_CLOUD requiere phoneNumberId y accessToken' });
    }

    if (proveedor === 'TWILIO' && !accessToken) {
      return res.status(400).json({ error: 'TWILIO requiere accessToken' });
    }

    // Crear número
    const nuevoNumero = await prisma.numeroWhatsapp.create({
      data: {
        usuarioId: req.user.id,
        nombre,
        numero: numeroNormalizado,
        proveedor,
        phoneNumberId: phoneNumberId || null,
        accessToken: accessToken || null, // TODO: Cifrar en producción
        sessionData: sessionData || null, // TODO: Cifrar en producción
        estadoConexion: 'disconnected',
      },
    });

    res.status(201).json(enmascarCredenciales(nuevoNumero));
  } catch (error) {
    next(error);
  }
});

// Actualizar estado de conexión
router.patch('/numeros/:id/conexion', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estadoConexion, sessionData } = req.body;

    const numero = await prisma.numeroWhatsapp.findFirst({
      where: {
        id,
        usuarioId: req.user.id,
      },
    });

    if (!numero) {
      return res.status(404).json({ error: 'Número no encontrado' });
    }

    const actualizado = await prisma.numeroWhatsapp.update({
      where: { id },
      data: {
        estadoConexion: estadoConexion || numero.estadoConexion,
        sessionData: sessionData || numero.sessionData,
        ultimaConexion: estadoConexion === 'connected' ? new Date() : numero.ultimaConexion,
      },
    });

    res.json(enmascarCredenciales(actualizado));
  } catch (error) {
    next(error);
  }
});

// Activar/Desactivar número
router.patch('/numeros/:id/activar', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'Se requiere campo activo (boolean)' });
    }

    const numero = await prisma.numeroWhatsapp.findFirst({
      where: {
        id,
        usuarioId: req.user.id,
      },
    });

    if (!numero) {
      return res.status(404).json({ error: 'Número no encontrado' });
    }

    const actualizado = await prisma.numeroWhatsapp.update({
      where: { id },
      data: { activo },
    });

    res.json(enmascarCredenciales(actualizado));
  } catch (error) {
    next(error);
  }
});

// Eliminar número
router.delete('/numeros/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const numero = await prisma.numeroWhatsapp.findFirst({
      where: {
        id,
        usuarioId: req.user.id,
      },
    });

    if (!numero) {
      return res.status(404).json({ error: 'Número no encontrado' });
    }

    await prisma.numeroWhatsapp.delete({
      where: { id },
    });

    res.json({ message: 'Número eliminado' });
  } catch (error) {
    next(error);
  }
});

// LISTA NEGRA

// Obtener lista negra del usuario
router.get('/lista-negra', async (req, res, next) => {
  try {
    const listaNegra = await prisma.listaNegra.findMany({
      where: {
        usuarioId: req.user.id,
      },
      include: {
        numeroWhatsapp: {
          select: {
            id: true,
            nombre: true,
            numero: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(listaNegra);
  } catch (error) {
    next(error);
  }
});

// Agregar número a lista negra
router.post('/lista-negra', async (req, res, next) => {
  try {
    const { numeroRemitente, nombreContacto, nota, numeroWhatsappId } = req.body;

    if (!numeroRemitente) {
      return res.status(400).json({ error: 'numeroRemitente es obligatorio' });
    }

    // Normalizar número
    const numeroNormalizado = normalizarNumeroE164(numeroRemitente);

    if (!numeroNormalizado) {
      return res.status(400).json({ error: 'Número de teléfono inválido' });
    }

    // Si se proporciona numeroWhatsappId, verificar que pertenezca al usuario
    if (numeroWhatsappId) {
      const numero = await prisma.numeroWhatsapp.findFirst({
        where: {
          id: numeroWhatsappId,
          usuarioId: req.user.id,
        },
      });

      if (!numero) {
        return res.status(400).json({ error: 'numeroWhatsappId no válido' });
      }
    }

    // Crear entrada en lista negra
    const entrada = await prisma.listaNegra.create({
      data: {
        usuarioId: req.user.id,
        numeroWhatsappId: numeroWhatsappId || null,
        numeroRemitente: numeroNormalizado,
        nombreContacto: nombreContacto || null,
        nota: nota || null,
      },
    });

    res.status(201).json(entrada);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Este número ya está en tu lista negra' });
    }
    next(error);
  }
});

// Eliminar número de lista negra
router.delete('/lista-negra/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const entrada = await prisma.listaNegra.findFirst({
      where: {
        id,
        usuarioId: req.user.id,
      },
    });

    if (!entrada) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    await prisma.listaNegra.delete({
      where: { id },
    });

    res.json({ message: 'Número eliminado de lista negra' });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Ver todos los números de la inmobiliaria
router.get('/admin/numeros', requireRole('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const numeros = await prisma.numeroWhatsapp.findMany({
      where: {
        usuario: {
          inmobiliariaId: req.user.inmobiliariaId,
        },
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enmascarar credenciales
    const numerosSeguros = numeros.map(enmascarCredenciales);

    res.json(numerosSeguros);
  } catch (error) {
    next(error);
  }
});

// ADMIN: Desactivar número de otro usuario
router.patch('/admin/numeros/:id/activar', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'Se requiere campo activo (boolean)' });
    }

    // Verificar que el número pertenezca a la misma inmobiliaria
    const numero = await prisma.numeroWhatsapp.findFirst({
      where: {
        id,
        usuario: {
          inmobiliariaId: req.user.inmobiliariaId,
        },
      },
    });

    if (!numero) {
      return res.status(404).json({ error: 'Número no encontrado' });
    }

    const actualizado = await prisma.numeroWhatsapp.update({
      where: { id },
      data: { activo },
    });

    res.json(enmascarCredenciales(actualizado));
  } catch (error) {
    next(error);
  }
});

export default router;
