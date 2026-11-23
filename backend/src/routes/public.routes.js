import express from 'express';
import { prisma } from '../index.js';

const router = express.Router();

// Middleware para resolver inmobiliaria por slug
const resolverInmobiliaria = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ error: 'Slug de inmobiliaria requerido' });
    }

    const inmobiliaria = await prisma.inmobiliaria.findUnique({
      where: { slug, activa: true },
    });

    if (!inmobiliaria) {
      return res.status(404).json({ error: 'Inmobiliaria no encontrada' });
    }

    req.inmobiliaria = inmobiliaria;
    next();
  } catch (error) {
    next(error);
  }
};

// Obtener propiedades públicas con filtros (con slug de inmobiliaria)
router.get('/:slug/propiedades', resolverInmobiliaria, async (req, res, next) => {
  try {
    const {
      tipo,
      zona,
      precioMin,
      precioMax,
      recamaras,
      formaPago,
      page = 1,
      limit = 12,
    } = req.query;

    const where = {
      inmobiliariaId: req.inmobiliaria.id,
      estadoPropiedad: 'DISPONIBLE',
    };

    if (tipo) {
      where.tipo = tipo;
    }

    if (zona) {
      where.OR = [
        { ciudad: { contains: zona, mode: 'insensitive' } },
        { colonia: { contains: zona, mode: 'insensitive' } },
      ];
    }

    if (precioMin || precioMax) {
      where.precio = {};
      if (precioMin) where.precio.gte = parseFloat(precioMin);
      if (precioMax) where.precio.lte = parseFloat(precioMax);
    }

    if (recamaras) {
      where.recamaras = { gte: parseInt(recamaras) };
    }

    if (formaPago) {
      switch (formaPago) {
        case 'contado':
          where.aceptaContado = true;
          break;
        case 'bancario':
          where.aceptaBancario = true;
          break;
        case 'infonavit':
          where.aceptaInfonavit = true;
          break;
        case 'fovissste':
          where.aceptaFovissste = true;
          break;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [propiedades, total] = await Promise.all([
      prisma.propiedad.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.propiedad.count({ where }),
    ]);

    res.json({
      propiedades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Obtener una propiedad por ID (con slug de inmobiliaria)
router.get('/:slug/propiedades/:id', resolverInmobiliaria, async (req, res, next) => {
  try {
    const { id } = req.params;

    const propiedad = await prisma.propiedad.findFirst({
      where: {
        id,
        inmobiliariaId: req.inmobiliaria.id,
      },
      include: {
        inmobiliaria: {
          select: {
            nombre: true,
            telefono: true,
            email: true,
            horario: true,
          },
        },
      },
    });

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    // Incrementar contador de vistas
    await prisma.propiedad.update({
      where: { id },
      data: { vistas: { increment: 1 } },
    });

    res.json(propiedad);
  } catch (error) {
    next(error);
  }
});

// Registrar clic en WhatsApp (con slug de inmobiliaria)
router.post('/:slug/propiedades/:id/whatsapp-click', resolverInmobiliaria, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.propiedad.update({
      where: { id },
      data: { clicsWhatsapp: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Crear prospecto desde formulario público (con slug de inmobiliaria)
router.post('/:slug/prospectos', resolverInmobiliaria, async (req, res, next) => {
  try {
    const {
      nombre,
      telefono,
      email,
      presupuesto,
      formaPago,
      creditoPreaprobado,
      origen,
      propiedadId,
      consentimientos,
    } = req.body;

    if (!nombre || !telefono) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const inmobiliariaId = req.inmobiliaria.id;

    // Calificar automáticamente
    const calificacion = calcularCalificacion({
      presupuesto,
      creditoPreaprobado,
      formaPago,
    });

    const prospecto = await prisma.prospecto.create({
      data: {
        inmobiliariaId,
        nombre,
        telefono,
        email,
        presupuesto: presupuesto ? parseFloat(presupuesto) : null,
        formaPago,
        creditoPreaprobado: creditoPreaprobado ? parseFloat(creditoPreaprobado) : null,
        calificacion,
        origen: origen || 'web',
        etapa: 'NUEVO',
      },
    });

    // Registrar interés en propiedad si se especificó
    if (propiedadId) {
      await prisma.interes.create({
        data: {
          prospectoId: prospecto.id,
          propiedadId,
        },
      });
    }

    // Registrar consentimientos
    if (consentimientos && consentimientos.length > 0) {
      await Promise.all(
        consentimientos.map((c) =>
          prisma.consentimiento.create({
            data: {
              inmobiliariaId,
              prospectoId: prospecto.id,
              titular: nombre,
              tipo: c.tipo,
              accion: 'OTORGA',
              versionDocumento: c.versionDocumento || '1.0',
              textoHash: c.textoHash || '',
              canal: 'web',
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
          })
        )
      );
    }

    res.status(201).json({ prospecto });
  } catch (error) {
    next(error);
  }
});

// Función auxiliar para calificar prospectos
function calcularCalificacion({ presupuesto, creditoPreaprobado, formaPago }) {
  const presupuestoNum = presupuesto ? parseFloat(presupuesto) : 0;
  const creditoNum = creditoPreaprobado ? parseFloat(creditoPreaprobado) : 0;

  // CALIENTE: Tiene presupuesto > 1M o crédito preaprobado > 800K
  if (presupuestoNum >= 1000000 || creditoNum >= 800000) {
    return 'CALIENTE';
  }

  // TIBIO: Tiene presupuesto > 500K o crédito > 400K
  if (presupuestoNum >= 500000 || creditoNum >= 400000) {
    return 'TIBIO';
  }

  // FRÍO: Resto
  return 'FRIO';
}

export default router;
