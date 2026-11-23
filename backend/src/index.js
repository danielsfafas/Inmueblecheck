import 'dotenv/config';
import express from 'express';
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

// Middleware de error
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 4311;

// Inicializar Prisma
export const prisma = new PrismaClient();

// Inicializar Redis
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6391');

// Middleware
app.use(helmet());
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

// Rutas públicas (sin autenticación)
app.use('/api/public', publicRoutes);

// Rutas con autenticación
app.use('/api/auth', authRoutes);
app.use('/api/inmobiliaria', inmobiliariaRoutes);
app.use('/api/propiedades', propiedadRoutes);
app.use('/api/prospectos', prospectoRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/recordatorios', recordatorioRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/consentimientos', consentimientoRoutes);
app.use('/api/videos', videoRoutes);

// Middleware de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`📍 Zona horaria: ${process.env.TZ || 'America/Mexico_City'}`);
  console.log(`🏢 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Manejo de señales
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recibido, cerrando servidor...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
