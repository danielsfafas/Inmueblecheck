import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas
import authRoutes from './routes/auth.routes.js';
import inmobiliariaRoutes from './routes/inmobiliaria.routes.js';
import propiedadRoutes from './routes/propiedad.routes.js';
import prospectoRoutes from './routes/prospecto.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import recordatorioRoutes from './routes/recordatorio.routes.js';
import reporteRoutes from './routes/reporte.routes.js';
import consentimientoRoutes from './routes/consentimiento.routes.js';
import publicRoutes from './routes/public.routes.js';
import videoRoutes from './routes/video.routes.js';
import botSimulatorRoutes from './routes/bot-simulator.routes.js';
import propiedadVideosRoutes from './routes/propiedad-videos.routes.js';
import propiedadFotosRoutes from './routes/propiedad-fotos.routes.js';
import miWhatsappRoutes from './routes/mi-whatsapp.routes.js';

// Middleware de error
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5191',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 4311;

// Inicializar Prisma
export const prisma = new PrismaClient();

// Inicializar Redis
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6391');

// Exportar io para usar en servicios
export { io };

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-src": ["'self'", "https://www.youtube-nocookie.com"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir archivos de video estáticamente (sin autenticación para facilitar pruebas)
// En producción, agregar autenticación o usar nombres únicos
const videosPath = path.join(__dirname, '..', 'videos');
app.use('/api/videos/files', express.static(videosPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
  },
}));

// Servir videos subidos por propiedades
const uploadsVideosPath = path.join(__dirname, '..', 'uploads', 'videos');
app.use('/uploads/videos', express.static(uploadsVideosPath, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.mp4') {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (ext === '.webm') {
      res.setHeader('Content-Type', 'video/webm');
    } else if (ext === '.mov') {
      res.setHeader('Content-Type', 'video/quicktime');
    }
  },
}));

// Servir fotos de seed
const seedPhotosPath = path.join(__dirname, '..', 'uploads', 'seed');
app.use('/uploads/seed', express.static(seedPhotosPath));

// Servir fotos de propiedades
const propiedadesFotosPath = path.join(__dirname, '..', 'uploads', 'propiedades');
app.use('/uploads/propiedades', express.static(propiedadesFotosPath));

// Rutas públicas (sin autenticación)
app.use('/api/public', publicRoutes);

// Rutas con autenticación
app.use('/api/auth', authRoutes);
app.use('/api/inmobiliaria', inmobiliariaRoutes);
app.use('/api/propiedades', propiedadRoutes);
app.use('/api/propiedades', propiedadVideosRoutes); // Rutas de videos de propiedades
app.use('/api/propiedades', propiedadFotosRoutes); // Rutas de fotos de propiedades
app.use('/api/prospectos', prospectoRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/mi-whatsapp', miWhatsappRoutes);
app.use('/api/recordatorios', recordatorioRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/consentimientos', consentimientoRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/bot-simulator', botSimulatorRoutes);

// Middleware de errores
app.use(errorHandler);

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  socket.on('subscribe-whatsapp', (numeroId) => {
    socket.join(`whatsapp-${numeroId}`);
    console.log(`📱 Cliente suscrito a número ${numeroId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// Handlers globales de error para evitar crashes por Baileys
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // No salir del proceso, solo registrar
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // No salir del proceso, solo registrar
});

// Iniciar sesiones WhatsApp al arrancar
(async () => {
  try {
    const { initializeAllSessions } = await import('./services/baileys.service.js');
    await initializeAllSessions(io);
  } catch (err) {
    console.warn('⚠️  Error inicializando sesiones WhatsApp:', err.message);
  }
})();

// Iniciar servidor
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`📍 Zona horaria: ${process.env.TZ || 'America/Mexico_City'}`);
  console.log(`🏢 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.IO activo`);
});

// Manejo de señales
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  io.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recibido, cerrando servidor...');
  io.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
