import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import P from 'pino';
import path from 'path';
import fs from 'fs/promises';
import { Boom } from '@hapi/boom';
import { prisma } from '../index.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { procesarMensajeBot } from './whatsappBot.service.js';

// Store activo de sesiones: { numeroId: { sock, state } }
const activeSessions = new Map();

// Store de QR codes para clientes web: { numeroId: qrCode }
const qrCodes = new Map();

// Store de límites de mensajes: { numeroId: { count, resetTime } }
const messageLimits = new Map();

const MENSAJE_LIMITE_POR_MINUTO = 30;

const logger = P({ level: 'warn' }); // Solo warnings y errores

/**
 * Obtener directorio de sesión para un número
 */
function getSessionDir(numeroId) {
  return path.join(process.cwd(), 'sessions', numeroId);
}

/**
 * Verificar límite de mensajes por minuto (anti-spam)
 */
function checkRateLimit(numeroId) {
  const now = Date.now();
  const limit = messageLimits.get(numeroId);

  if (!limit) {
    messageLimits.set(numeroId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (now > limit.resetTime) {
    messageLimits.set(numeroId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= MENSAJE_LIMITE_POR_MINUTO) {
    console.warn(`⚠️  Límite de mensajes alcanzado para número ${numeroId}`);
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Delay humano aleatorio (mitigación anti-bloqueo)
 */
function humanDelay() {
  return new Promise((resolve) => {
    const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 segundos
    setTimeout(resolve, delay);
  });
}

/**
 * Iniciar sesión de Baileys para un número
 */
export async function startBaileysSession(numeroWhatsappId, io) {
  try {
    console.log(`📱 Iniciando sesión Baileys para número ${numeroWhatsappId}`);

    // Verificar si ya existe sesión activa
    if (activeSessions.has(numeroWhatsappId)) {
      console.log(`✅ Sesión ya activa para ${numeroWhatsappId}`);
      return activeSessions.get(numeroWhatsappId).sock;
    }

    // Obtener datos del número desde BD
    const numeroWhatsapp = await prisma.numeroWhatsapp.findUnique({
      where: { id: numeroWhatsappId },
      include: { usuario: true },
    });

    if (!numeroWhatsapp) {
      throw new Error('Número WhatsApp no encontrado');
    }

    const sessionDir = getSessionDir(numeroWhatsappId);
    await fs.mkdir(sessionDir, { recursive: true });

    // Si hay sessionData cifrada guardada, restaurarla
    if (numeroWhatsapp.sessionData) {
      try {
        const decrypted = decrypt(numeroWhatsapp.sessionData);
        const sessionFiles = JSON.parse(decrypted);
        
        // Escribir archivos de sesión
        for (const [filename, content] of Object.entries(sessionFiles)) {
          await fs.writeFile(
            path.join(sessionDir, filename),
            JSON.stringify(content)
          );
        }
        console.log('✅ Sesión restaurada desde BD');
      } catch (err) {
        console.warn('⚠️  Error restaurando sesión, se generará nueva:', err.message);
      }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache: {},
      generateHighQualityLinkPreview: true,
      markOnlineOnConnect: false, // No aparecer online automáticamente
    });

    // Guardar en store activo
    activeSessions.set(numeroWhatsappId, { sock, state });

    // Event: connection update
    sock.ev.on('connection.update', async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;

        // QR Code generado
        if (qr) {
          console.log(`📱 QR generado para ${numeroWhatsappId}`);
          qrCodes.set(numeroWhatsappId, qr);

          // Emitir QR por WebSocket
          if (io) {
            io.to(`whatsapp-${numeroWhatsappId}`).emit('qr', { numeroId: numeroWhatsappId, qr });
          }

          // Actualizar estado en BD (usar updateMany para evitar error si fue eliminado)
          try {
            await prisma.numeroWhatsapp.updateMany({
              where: { id: numeroWhatsappId },
              data: { estadoConexion: 'waiting_qr' },
            });
          } catch (err) {
            console.warn(`No se pudo actualizar estado: ${err.message}`);
          }
        }

        // Conectado exitosamente
        if (connection === 'open') {
          console.log(`✅ WhatsApp conectado: ${numeroWhatsappId}`);
          qrCodes.delete(numeroWhatsappId);

          // Guardar sesión cifrada en BD
          try {
            const sessionFiles = {};
            const files = await fs.readdir(sessionDir);
            
            for (const file of files) {
              const content = await fs.readFile(path.join(sessionDir, file), 'utf-8');
              sessionFiles[file] = JSON.parse(content);
            }

            const sessionData = encrypt(JSON.stringify(sessionFiles));

            await prisma.numeroWhatsapp.updateMany({
              where: { id: numeroWhatsappId },
              data: {
                estadoConexion: 'connected',
                ultimaConexion: new Date(),
                sessionData,
              },
            });
          } catch (err) {
            console.error('Error guardando sesión:', err);
          }

          // Emitir evento por WebSocket
          if (io) {
            io.to(`whatsapp-${numeroWhatsappId}`).emit('connected', { numeroId: numeroWhatsappId });
          }
        }

        // Desconexión
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error instanceof Boom) &&
            lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;

          console.log(`⚠️  Conexión cerrada para ${numeroWhatsappId}, reconectar:`, shouldReconnect);

          activeSessions.delete(numeroWhatsappId);
          qrCodes.delete(numeroWhatsappId);

          // Verificar si el número aún existe antes de reconectar/actualizar
          const exists = await prisma.numeroWhatsapp.findUnique({
            where: { id: numeroWhatsappId },
            select: { activo: true },
          });

          if (!exists) {
            console.log(`⚠️  Número ${numeroWhatsappId} fue eliminado, no reconectar`);
            return;
          }

          if (shouldReconnect && exists.activo) {
            // Reconexión automática después de 5 segundos
            setTimeout(() => {
              console.log(`🔄 Reconectando ${numeroWhatsappId}...`);
              startBaileysSession(numeroWhatsappId, io);
            }, 5000);
          } else {
            try {
              await prisma.numeroWhatsapp.updateMany({
                where: { id: numeroWhatsappId },
                data: { estadoConexion: 'disconnected' },
              });
            } catch (err) {
              console.warn(`No se pudo actualizar estado: ${err.message}`);
            }

            if (io) {
              io.to(`whatsapp-${numeroWhatsappId}`).emit('disconnected', { numeroId: numeroWhatsappId });
            }
          }
        }
      } catch (error) {
        console.error(`Error en connection.update para ${numeroWhatsappId}:`, error);
      }
    });

    // Event: credentials update
    sock.ev.on('creds.update', saveCreds);

    // Event: messages (mensajes entrantes)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          // Ignorar grupos, estados y broadcasts (mitigación anti-bloqueo)
          if (msg.key.remoteJid.endsWith('@g.us')) {
            console.log('🚫 Ignorando mensaje de grupo (anti-bloqueo)');
            continue;
          }

          if (msg.key.remoteJid === 'status@broadcast') {
            console.log('🚫 Ignorando estado (anti-bloqueo)');
            continue;
          }

          // Solo responder a mensajes entrantes directos
          if (!msg.message || msg.key.fromMe) continue;

          const from = msg.key.remoteJid.replace('@s.whatsapp.net', '');
          const text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || '';

          if (!text) continue;

          console.log(`📩 Mensaje recibido de ${from}: ${text.substring(0, 50)}...`);

          // Verificar límite de mensajes (anti-spam)
          if (!checkRateLimit(numeroWhatsappId)) {
            console.warn('⚠️  Límite de mensajes alcanzado, ignorando mensaje');
            continue;
          }

          // Procesar con el bot (pasa por lista negra y lógica existente)
          // phoneNumberId null para Baileys, se usa numeroWhatsappId
          await procesarMensajeBot(from, text, null, numeroWhatsappId);

        } catch (err) {
          console.error('Error procesando mensaje:', err);
        }
      }
    });

    console.log(`✅ Sesión Baileys iniciada para ${numeroWhatsappId}`);
    return sock;

  } catch (error) {
    console.error(`❌ Error iniciando sesión Baileys para ${numeroWhatsappId}:`, error);
    
    await prisma.numeroWhatsapp.update({
      where: { id: numeroWhatsappId },
      data: { estadoConexion: 'error' },
    });

    throw error;
  }
}

/**
 * Enviar mensaje por Baileys
 */
export async function sendBaileysMessage(numeroWhatsappId, to, text) {
  try {
    const session = activeSessions.get(numeroWhatsappId);
    
    if (!session) {
      throw new Error('Sesión no activa');
    }

    // Delay humano antes de enviar (mitigación anti-bloqueo)
    await humanDelay();

    // Simular "escribiendo..." (mitigación anti-bloqueo)
    await session.sock.sendPresenceUpdate('composing', `${to}@s.whatsapp.net`);
    
    // Delay adicional mientras "escribe"
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    await session.sock.sendPresenceUpdate('paused', `${to}@s.whatsapp.net`);

    // Enviar mensaje
    await session.sock.sendMessage(`${to}@s.whatsapp.net`, {
      text,
    });

    console.log(`✅ Mensaje enviado a ${to} desde ${numeroWhatsappId}`);
    return true;

  } catch (error) {
    console.error('Error enviando mensaje Baileys:', error);
    throw error;
  }
}

/**
 * Desconectar sesión
 */
export async function stopBaileysSession(numeroWhatsappId) {
  try {
    const session = activeSessions.get(numeroWhatsappId);
    
    if (session) {
      // 1. Remover todos los listeners ANTES de cerrar
      session.sock.ev.removeAllListeners();
      
      // 2. Logout y cerrar socket
      try {
        await session.sock.logout();
      } catch (err) {
        console.warn('Error en logout:', err.message);
      }
      
      // 3. Limpiar de memoria
      activeSessions.delete(numeroWhatsappId);
      qrCodes.delete(numeroWhatsappId);
      messageLimits.delete(numeroWhatsappId);

      // 4. Limpiar archivos de sesión
      const sessionDir = getSessionDir(numeroWhatsappId);
      await fs.rm(sessionDir, { recursive: true, force: true });

      // 5. Actualizar BD (última operación)
      try {
        await prisma.numeroWhatsapp.updateMany({
          where: { id: numeroWhatsappId },
          data: {
            estadoConexion: 'disconnected',
            sessionData: null,
          },
        });
      } catch (err) {
        console.warn('No se pudo actualizar BD:', err.message);
      }

      console.log(`✅ Sesión Baileys detenida para ${numeroWhatsappId}`);
    }
  } catch (error) {
    console.error('Error deteniendo sesión:', error);
    // No throw para evitar crash
  }
}

/**
 * Obtener QR code actual
 */
export function getQRCode(numeroWhatsappId) {
  return qrCodes.get(numeroWhatsappId);
}

/**
 * Obtener sesión activa
 */
export function getActiveSession(numeroWhatsappId) {
  return activeSessions.get(numeroWhatsappId);
}

/**
 * Iniciar todas las sesiones activas al arrancar el backend
 */
export async function initializeAllSessions(io) {
  try {
    console.log('🔄 Inicializando sesiones WhatsApp...');

    const numerosActivos = await prisma.numeroWhatsapp.findMany({
      where: {
        activo: true,
        proveedor: 'BAILEYS',
      },
    });

    console.log(`📱 ${numerosActivos.length} número(s) activo(s) encontrado(s)`);

    for (const numero of numerosActivos) {
      try {
        await startBaileysSession(numero.id, io);
      } catch (err) {
        console.error(`Error iniciando sesión ${numero.id}:`, err.message);
      }
    }

    console.log('✅ Sesiones WhatsApp inicializadas');
  } catch (error) {
    console.error('Error inicializando sesiones:', error);
  }
}
