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

// Store de mensajes procesados (deduplicación): { messageId: timestamp }
const processedMessages = new Map();

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
      browser: ['InmuebleCheck', 'Chrome', '1.0.0'], // Aparece como "InmuebleCheck" en dispositivos vinculados
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
          const statusCode = lastDisconnect?.error instanceof Boom 
            ? lastDisconnect.error.output?.statusCode 
            : null;

          console.log(`⚠️  Conexión cerrada para ${numeroWhatsappId}, statusCode:`, statusCode);

          // Verificar si el número aún existe antes de reconectar/actualizar
          const exists = await prisma.numeroWhatsapp.findUnique({
            where: { id: numeroWhatsappId },
            select: { activo: true },
          });

          if (!exists) {
            console.log(`⚠️  Número ${numeroWhatsappId} fue eliminado, no reconectar`);
            activeSessions.delete(numeroWhatsappId);
            qrCodes.delete(numeroWhatsappId);
            return;
          }

          // Manejar casos específicos
          if (statusCode === DisconnectReason.loggedOut) {
            // Usuario cerró sesión desde WhatsApp: borrar sesión y marcar desconectado
            console.log('🔴 Sesión cerrada (loggedOut), limpiar credenciales');
            
            activeSessions.delete(numeroWhatsappId);
            qrCodes.delete(numeroWhatsappId);

            try {
              await prisma.numeroWhatsapp.updateMany({
                where: { id: numeroWhatsappId },
                data: { 
                  estadoConexion: 'disconnected',
                  sessionData: null,
                },
              });
            } catch (err) {
              console.warn(`No se pudo actualizar estado: ${err.message}`);
            }

            // Limpiar archivos de sesión
            const sessionDir = getSessionDir(numeroWhatsappId);
            try {
              await fs.rm(sessionDir, { recursive: true, force: true });
            } catch (err) {
              console.warn('Error limpiando sesión:', err.message);
            }

            if (io) {
              io.to(`whatsapp-${numeroWhatsappId}`).emit('disconnected', { numeroId: numeroWhatsappId });
            }
          } else if (statusCode === DisconnectReason.restartRequired) {
            // Baileys requiere restart (código 515): recrear socket con mismas credenciales
            console.log('🔄 Restart requerido (515), recreando socket con credenciales existentes...');
            
            activeSessions.delete(numeroWhatsappId);
            qrCodes.delete(numeroWhatsappId);

            if (exists.activo) {
              setTimeout(() => {
                console.log('🔄 Reconectando después de restartRequired...');
                startBaileysSession(numeroWhatsappId, io);
              }, 2000);
            }
          } else if (statusCode === DisconnectReason.connectionReplaced) {
            // Otra sesión tomó el control
            console.log('⚠️  Conexión reemplazada desde otro dispositivo');
            
            activeSessions.delete(numeroWhatsappId);
            qrCodes.delete(numeroWhatsappId);

            try {
              await prisma.numeroWhatsapp.updateMany({
                where: { id: numeroWhatsappId },
                data: { estadoConexion: 'disconnected' },
              });
            } catch (err) {
              console.warn(`No se pudo actualizar estado: ${err.message}`);
            }

            if (io) {
              io.to(`whatsapp-${numeroWhatsappId}`).emit('disconnected', { 
                numeroId: numeroWhatsappId,
                reason: 'Conexión reemplazada desde otro dispositivo' 
              });
            }
          } else {
            // Otros errores: intentar reconectar si está activo
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && exists.activo;

            console.log(`⚠️  Reconectar: ${shouldReconnect}`);

            activeSessions.delete(numeroWhatsappId);
            qrCodes.delete(numeroWhatsappId);

            if (shouldReconnect) {
              setTimeout(() => {
                console.log('🔄 Reconectando después de error...');
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
          // 1. Deduplicación: ignorar mensajes ya procesados (mismo msg.key.id)
          const messageId = msg.key.id;
          if (processedMessages.has(messageId)) {
            console.log(`🔄 Mensaje duplicado (id: ${messageId}), ignorando`);
            continue;
          }
          
          // Marcar como procesado (TTL 10 minutos)
          processedMessages.set(messageId, Date.now());
          setTimeout(() => processedMessages.delete(messageId), 10 * 60 * 1000);

          // 2. Filtrar tipos de mensaje no deseados
          const remoteJid = msg.key.remoteJid;

          // Ignorar grupos
          if (remoteJid.endsWith('@g.us')) {
            console.log('🚫 Ignorando mensaje de grupo (anti-bloqueo)');
            continue;
          }

          // Ignorar estados
          if (remoteJid === 'status@broadcast') {
            console.log('🚫 Ignorando estado (anti-bloqueo)');
            continue;
          }

          // Ignorar newsletters
          if (remoteJid.includes('@newsletter')) {
            console.log('🚫 Ignorando mensaje de newsletter');
            continue;
          }

          // Ignorar llamadas (Baileys los marca con messageType call)
          if (msg.message?.call) {
            console.log('🚫 Ignorando llamada');
            continue;
          }

          // Solo responder a mensajes entrantes directos
          if (!msg.message || msg.key.fromMe) continue;

          // 3. Extraer texto del mensaje
          const text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || '';

          if (!text) continue;

          // 4. Resolver número real desde LID o formato clásico
          let telefono = null;
          let pushName = msg.pushName || null; // Nombre visible del usuario (para prospecto)
          
          // WhatsApp ahora usa LID (@lid) en vez de @s.whatsapp.net
          if (remoteJid.includes('@lid')) {
            // Baileys 7.x expone campos alt para resolución LID:
            // - msg.key.participantAlt: PN del remitente en grupos
            // - msg.key.remoteJidAlt: PN del chat 1-a-1
            // - sock.signalRepository.lidMapping.getPNForLID(): mapeo persistente
            
            const pnFromAlt = msg.key.remoteJidAlt || msg.key.participantAlt;
            
            if (pnFromAlt && pnFromAlt.includes('@s.whatsapp.net')) {
              // Resuelto desde campos alt
              telefono = pnFromAlt.replace('@s.whatsapp.net', '');
              console.log(`✅ LID resuelto (alt): ${remoteJid} → +${telefono}`);
            } else {
              // Intentar desde mapeo persistente de Baileys
              try {
                const session = activeSessions.get(numeroWhatsappId);
                if (session?.sock?.signalRepository?.lidMapping) {
                  const pnResolved = await session.sock.signalRepository.lidMapping.getPNForLID(remoteJid);
                  if (pnResolved) {
                    telefono = pnResolved.replace('@s.whatsapp.net', '');
                    console.log(`✅ LID resuelto (mapping): ${remoteJid} → +${telefono}`);
                  }
                }
              } catch (err) {
                console.warn(`Error resolviendo LID desde mapping: ${err.message}`);
              }
            }
            
            // Fallback: guardar el LID completo para tracking
            if (!telefono) {
              telefono = remoteJid; // Guardar LID como fallback
              console.log(`⚠️  No se pudo resolver LID a PN, usando LID: ${remoteJid}`);
            }
          } else {
            // Formato clásico @s.whatsapp.net
            telefono = remoteJid.replace('@s.whatsapp.net', '');
          }

          console.log(`📩 Mensaje recibido de ${remoteJid}: ${text.substring(0, 50)}...`);

          // 5. Verificar límite de mensajes (anti-spam)
          if (!checkRateLimit(numeroWhatsappId)) {
            console.warn('⚠️  Límite de mensajes alcanzado, ignorando mensaje');
            continue;
          }

          // 6. Procesar con el bot
          // Pasar: telefono (E.164 o LID), texto, phoneNumberId (null), numeroWhatsappId, remoteJid, pushName
          await procesarMensajeBot(telefono, text, null, numeroWhatsappId, remoteJid, pushName);

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
 * @param {string} numeroWhatsappId - ID del número WhatsApp
 * @param {string} to - Número destino (E.164 sin +) o LID completo
 * @param {string} text - Texto del mensaje
 * @param {string} remoteJid - JID original del remitente (para responder correctamente a @lid o @s.whatsapp.net)
 */
export async function sendBaileysMessage(numeroWhatsappId, to, text, remoteJid = null) {
  try {
    const session = activeSessions.get(numeroWhatsappId);
    
    if (!session) {
      throw new Error('Sesión no activa');
    }

    // Construir JID de destino
    let destinoJid;
    if (remoteJid) {
      // Usar el JID original del mensaje entrante (puede ser @lid o @s.whatsapp.net)
      destinoJid = remoteJid;
    } else if (to.includes('@')) {
      // Ya viene con el sufijo completo
      destinoJid = to;
    } else {
      // Formato clásico: agregar @s.whatsapp.net
      destinoJid = `${to}@s.whatsapp.net`;
    }

    // Delay humano antes de enviar (mitigación anti-bloqueo)
    await humanDelay();

    // Simular "escribiendo..." (mitigación anti-bloqueo)
    await session.sock.sendPresenceUpdate('composing', destinoJid);
    
    // Delay adicional mientras "escribe"
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    await session.sock.sendPresenceUpdate('paused', destinoJid);

    // Enviar mensaje
    await session.sock.sendMessage(destinoJid, {
      text,
    });

    console.log(`✅ Mensaje enviado a ${destinoJid} desde ${numeroWhatsappId}`);
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
        // Solo restaurar sesiones que estaban conectadas (tienen sessionData)
        // Evitar loops de QR 408 en startup para números sin conexión previa
        estadoConexion: 'connected',
      },
    });

    console.log(`📱 ${numerosActivos.length} sesión(es) conectada(s) a restaurar`);

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
