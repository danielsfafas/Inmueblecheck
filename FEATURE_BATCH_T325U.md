# Feature Batch T325U - Escalamiento, Conversaciones y Citas

## Estado: 🔨 En Progreso - Infraestructura Base Creada

Este documento describe el feature batch completo solicitado por Daniel.

---

## ✅ Completado

### 1. Schema Prisma + Migraciones

**Archivos**:
- `backend/prisma/schema.prisma` - Actualizado con todos los modelos
- `backend/prisma/migrations/20261124040849_add_notificaciones_citas_escalamiento/`

**Modelos Nuevos**:
- ✅ `Notificacion` (tipo, título, mensaje, enlace, leída)
- ✅ `Cita` (fecha, hora, estado, origen, asesor, prospecto, propiedad)
- ✅ `HorarioCitas` (horario por día de semana, pausas)
- ✅ `CierreCalendario` (cierres full-day o parciales)

**Campos Nuevos**:
- ✅ `Usuario.telefonoWhatsapp` (opcional, para notificaciones WA)
- ✅ `Conversacion.botPausadoHasta` (DateTime, auto-resume)
- ✅ `Conversacion.flujoBot` (nombre del flujo activo)
- ✅ `Conversacion.flujoEstado` (Json, estado del flujo)
- ✅ `Inmobiliaria.horasAutoresumeBotPausa` (default 24)
- ✅ `Inmobiliaria.duracionCitaMin` (default 60)
- ✅ `Inmobiliaria.tiempoAntelacionMin` (default 120)
- ✅ `Inmobiliaria.diasConCitasAdelante` (default 45)

**Enums**:
- ✅ `TipoNotificacion` (AGENTE_SOLICITADO, CITA_CREADA, etc.)
- ✅ `EstadoCita` (PENDIENTE, CONFIRMADA, COMPLETADA, CANCELADA, NO_ASISTIO)
- ✅ `OrigenCita` (WHATSAPP, ADMIN, WEB)

---

## 📋 Pendiente de Implementar

### A) ESCALAMIENTO AGENTE

**Archivo**: `backend/src/services/whatsappBot.service.js` (~línea 257)

#### A.1 WhatsApp al Asesor
```javascript
// En comando AGENTE:
// 1. Obtener asesor asignado o admin dueño del NumeroWhatsapp
// 2. Si tiene telefonoWhatsapp configurado:
//    - Enviar mensaje via sendBaileysMessage() al mismo numeroWhatsapp
//    - Contenido: nombre prospecto, teléfono, propiedad de interés (si hay),
//      últimos 3 mensajes del cliente, link al panel
// 3. Si no tiene teléfono: log warning
```

**Función sugerida**:
```javascript
async function notificarAsesorPorWhatsApp(
  numeroWhatsappId,
  prospecto,
  conversacion,
  propiedadInteres
) {
  // Implementar
}
```

#### A.2 Notificación Panel
```javascript
// 1. Crear registro en Notificacion:
await prisma.notificacion.create({
  data: {
    inmobiliariaId,
    usuarioId: asesorId,
    tipo: 'AGENTE_SOLICITADO',
    titulo: `${prospecto.nombre} solicita atención`,
    mensaje: `Prospecto: ${prospecto.telefono}...`,
    enlace: `/admin/conversaciones/${conversacion.id}`,
  }
});

// 2. Emitir Socket.IO:
io.to(`user-${asesorId}`).emit('notificacion', { ... });
```

#### A.3 Pausar Bot
```javascript
// Al ejecutar AGENTE:
const horasAutoresume = prospecto.inmobiliaria.horasAutoresumeBotPausa || 24;
await prisma.conversacion.update({
  where: { id: conversacion.id },
  data: {
    pasadoAHumano: true,
    botPausadoHasta: new Date(Date.now() + horasAutoresume * 3600000),
  }
});
```

#### A.4 Lógica Pausa en Bot
```javascript
// En procesarMensajeBot(), ANTES de generar respuesta IA:

// Si botPausadoHasta existe y es futuro -> NO responder (solo guardar mensaje)
if (conversacion.botPausadoHasta && conversacion.botPausadoHasta > new Date()) {
  console.log('Bot pausado hasta', conversacion.botPausadoHasta);
  return; // Solo guardar mensaje, no reply
}

// Si botPausadoHasta pasó -> auto-reactivar
if (conversacion.botPausadoHasta && conversacion.botPausadoHasta <= new Date()) {
  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { botPausadoHasta: null, pasadoAHumano: false }
  });
}
```

#### A.5 Fix Bug: Una Conversación por NumeroWhatsapp
```javascript
// ACTUAL (línea ~156):
let conversacion = await prisma.conversacion.findFirst({
  where: {
    prospectoId: prospecto.id,
    pasadoAHumano: false, // ← BUG: crea nueva después de AGENTE
  }
});

// CORREGIR A:
let conversacion = await prisma.conversacion.findFirst({
  where: {
    prospectoId: prospecto.id,
    numeroWhatsappId: numeroReceptor.id,
    // SIN filtro pasadoAHumano: una conversación activa por numeroWhatsapp
  },
  orderBy: { createdAt: 'desc' },
});
```

---

### B) LISTADO DE CONVERSACIONES

**Archivos nuevos**:
- `backend/src/routes/conversaciones.routes.js`
- `frontend/src/pages/dashboard/ConversacionesPage.jsx`
- `frontend/src/pages/dashboard/ConversacionDetallePage.jsx`

#### B.1 Backend Routes

```javascript
// GET /api/conversaciones
// - Query: search (phone/name), status (bot_activo|pausado|pasado_humano)
// - Scoping: usuario.inmobiliariaId
// - Return: array con phone, nombre, lastMessage, fecha, status

// GET /api/conversaciones/:id
// - Return: conversacion completa + mensajes[] + prospecto + acciones

// POST /api/conversaciones/:id/reactivar-bot
// - Set botPausadoHasta = null, pasadoAHumano = false

// POST /api/conversaciones/:id/pausar-bot
// - Set botPausadoHasta = now + horasAutoresume

// POST /api/conversaciones/:id/enviar-mensaje
// - Body: { contenido }
// - Enviar via sendBaileysMessage()
// - Guardar Mensaje con remitente: 'asesor'
```

#### B.2 Frontend Page

**ConversacionesPage.jsx**:
- Tabla/lista: phone (bold), nombre, preview último mensaje, fecha, chips status
- Filtros: search bar, dropdown status
- Click row → navigate to `/admin/conversaciones/:id`
- Real-time: Socket.IO listener para actualizar lista

**ConversacionDetallePage.jsx**:
- Chat bubbles (client vs bot vs asesor)
- Sidebar: prospecto info, link a `/admin/prospectos/:id`
- Acciones:
  - Botón "Reactivar Bot" (si pausado/pasado)
  - Botón "Pausar Bot" (si activo)
  - Textbox + botón "Enviar" para reply manual

#### B.3 Socket.IO Events

```javascript
// Backend emit:
io.to(`inmobiliaria-${inmobiliariaId}`).emit('mensaje-nuevo', {
  conversacionId,
  mensaje
});

// Frontend listener:
socket.on('mensaje-nuevo', (data) => {
  // Actualizar lista o detalle
});
```

---

### C) CITAS / VISITAS

**Archivos nuevos**:
- `backend/src/services/citas.service.js` (algoritmo slots)
- `backend/src/services/citasFlow.service.js` (flujo WhatsApp)
- `backend/src/routes/citas.routes.js`
- `backend/src/routes/horarios.routes.js`
- `frontend/src/pages/dashboard/CitasPage.jsx`
- `frontend/src/pages/dashboard/HorariosPage.jsx`
- `backend/src/jobs/citasReminders.js`

#### C.1 Algoritmo de Slots

**Archivo**: `backend/src/services/citas.service.js`

```javascript
export async function obtenerSlotsDisponibles(inmobiliariaId, fecha) {
  // 1. Obtener HorarioCitas para día de semana
  // 2. Obtener CierreCalendario para fecha
  // 3. Generar grid: [horaInicio..horaFin] cada duracionMin
  // 4. Skip pausas (lunch)
  // 5. Filtrar slots con cierres parciales
  // 6. Obtener citas activas (PENDIENTE|CONFIRMADA) para esa fecha
  // 7. Calcular capacidad:
  //    - Max 1 cita por asesor en ese slot
  //    - Max 1 cita por propiedad en ese slot
  //    - Capacidad total = min(asesoresLibres, propiedadesLibres)
  // 8. Si hoy: filtrar slots < now + tiempoAntelacionMin
  // 9. Return: [{ hora, capacidad, asesoresLibres }]
}

export async function validarSlotDisponible(
  inmobiliariaId,
  fecha,
  hora,
  propiedadId,
  asesorId
) {
  // Validar:
  // - Slot no pasado
  // - Horario abierto
  // - No cierre
  // - Asesor libre (no tiene otra cita PENDIENTE|CONFIRMADA en ese slot)
  // - Propiedad libre (no tiene otra cita en ese slot)
  // - Lead time respetado si es hoy
  // Return: { valido, error }
}
```

#### C.2 Flujo WhatsApp Booking

**Archivo**: `backend/src/services/citasFlow.service.js`

```javascript
// Estado del flujo (guardado en Conversacion.flujoEstado):
{
  paso: 1-5,
  propiedadId: null,
  fechaSeleccionada: null,
  horaSeleccionada: null
}

// Paso 1: ¿Qué propiedad? (si no hay interes previo)
// Paso 2: Ofrecer N días con disponibilidad (numbered)
// Paso 3: Ofrecer horas libres ese día (numbered)
// Paso 4: Resumen + confirmar (1) / cancelar (0)
// Paso 5: Crear Cita + notificar + reply confirmación

// AGENTE en medio del flujo:
//   - Limpiar flujoBot + flujoEstado
//   - Escalar normalmente
```

**Integración en ia.service.js**:
```javascript
// Reemplazar intent "agendar visita" (~línea 157):
if (detectarIntent(mensaje, ['agendar', 'visita', 'ver propiedad'])) {
  // Iniciar flujo:
  return await iniciarFlujoCita(conversacion, contexto);
}

// En generarRespuestaIA(), al inicio:
if (conversacion.flujoBot === 'booking') {
  return await procesarFlujoCita(conversacion, mensaje, contexto);
}
```

#### C.3 Admin Citas Page

**CitasPage.jsx**:
- Vistas: Agenda semanal, Día, Lista
- Filtros: estado, asesor, propiedad
- Vista "Por confirmar" (PENDIENTE)
- Crear cita manual: modal con prospecto, propiedad, asesor, slot picker
- Acciones por cita: Confirmar, Cancelar, Completar, No-show, Reagendar
- Al confirmar/cancelar: enviar WhatsApp template al cliente

#### C.4 Horarios Config Page

**HorariosPage.jsx** (o sección en Configuración):
- Tabla: 7 días semana
- Por día: activo, horaInicio, horaFin, pausaInicio, pausaFin
- Duración cita (global inmobiliaria)
- Lead time (global)
- Lista cierres calendario (fecha, motivo, agregar/eliminar)

#### C.5 Reminders Job

**Archivo**: `backend/src/jobs/citasReminders.js`

```javascript
// setInterval cada 1 minuto:
export function iniciarJobRecordatoriosCitas() {
  setInterval(async () => {
    const ahora = new Date();
    const en2Horas = new Date(ahora.getTime() + 120 * 60000);
    
    // Buscar citas CONFIRMADAS sin recordatorio enviado
    // con startsAt entre ahora y en2Horas
    const citas = await prisma.cita.findMany({
      where: {
        estado: 'CONFIRMADA',
        recordatorioEnviadoAt: null,
        // fecha/hora entre ahora y en2Horas
      },
      include: { prospecto, asesor, propiedad }
    });
    
    for (const cita of citas) {
      // Enviar WhatsApp al cliente
      // Enviar WhatsApp al asesor (si tiene teléfono)
      // Marcar recordatorioEnviadoAt
    }
  }, 60000);
}

// Llamar en backend/src/index.js:
import { iniciarJobRecordatoriosCitas } from './jobs/citasReminders.js';
iniciarJobRecordatoriosCitas();
```

#### C.6 Timezone

Everywhere: `America/Mexico_City`

```javascript
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
const TZ = 'America/Mexico_City';
```

---

## 🧪 Tests Requeridos

### Unit Tests

**`backend/__tests__/citasSlots.test.js`**:
- ✅ Generar slots básicos (9-18h, 60min)
- ✅ Excluir lunch break (14-15h)
- ✅ Excluir cierres full-day
- ✅ Excluir cierres parciales
- ✅ Filtrar slots pasados + lead time
- ✅ Capacidad: 1 asesor + 1 propiedad por slot
- ✅ Validar double-booking (409)

**`backend/__tests__/citasFlowWhatsApp.test.js`**:
- ✅ Flujo completo: saludo → listar → elegir prop → elegir día → elegir hora → confirmar
- ✅ Full slot: ofrecer otros días
- ✅ AGENTE mid-flow: abortar flujo + escalar
- ✅ Cancelar/menu: salir de flujo
- ✅ Invalid input: re-prompt

**`backend/__tests__/conversacionesUniqueness.test.js`**:
- ✅ Después de AGENTE: nuevo mensaje NO crea conversación nueva
- ✅ Una conversación activa por prospecto+numeroWhatsapp

---

## 📦 Dependencies Nuevas

```json
{
  "date-fns-tz": "^2.0.0"
}
```

```bash
cd backend && npm install date-fns-tz
```

---

## 🌱 Seed Data

**Archivo**: `backend/prisma/seed.js` (agregar al seed existente)

```javascript
// HorarioCitas para Casas Hidalgo (Lun-Vie 9-18, Sab 9-14)
const diasLaborales = [
  { dia: 1, inicio: '09:00', fin: '18:00', pausa: ['14:00', '15:00'] }, // Lun
  { dia: 2, inicio: '09:00', fin: '18:00', pausa: ['14:00', '15:00'] },
  { dia: 3, inicio: '09:00', fin: '18:00', pausa: ['14:00', '15:00'] },
  { dia: 4, inicio: '09:00', fin: '18:00', pausa: ['14:00', '15:00'] },
  { dia: 5, inicio: '09:00', fin: '18:00', pausa: ['14:00', '15:00'] },
  { dia: 6, inicio: '09:00', fin: '14:00', pausa: null }, // Sab
  { dia: 7, activo: false }, // Dom cerrado
];

// 2 citas ejemplo: 1 PENDIENTE, 1 CONFIRMADA
```

---

## 🧪 Manual Test Script

```bash
# 1. Aplicar migración
cd backend
npx prisma migrate deploy

# 2. Seed horarios
npm run seed

# 3. Configurar teléfono asesor
# - Login admin → Configuración → Usuarios → Editar
# - Agregar telefonoWhatsapp: +5215512345678

# 4. Test escalamiento AGENTE
# - Enviar mensaje WhatsApp: "AGENTE"
# - Verificar:
#   ✅ Asesor recibe WhatsApp
#   ✅ Panel muestra notificación
#   ✅ Siguiente mensaje cliente NO genera respuesta bot
#   ✅ Después 24h: bot auto-resume

# 5. Test reactivar bot manual
# - Admin → Conversaciones → Select conversación → "Reactivar Bot"
# - Cliente envía mensaje → bot responde ✅

# 6. Test booking flow
# - Cliente: "Quiero agendar una visita"
# - Bot: lista propiedades
# - Cliente: "1"
# - Bot: lista días disponibles
# - Cliente: "2"
# - Bot: lista horas
# - Cliente: "3"
# - Bot: resumen + confirmar
# - Cliente: "1"
# - Verificar:
#   ✅ Cita creada PENDIENTE
#   ✅ Asesor recibe WhatsApp
#   ✅ Panel muestra notificación
#   ✅ Prospecto.etapa → VISITA

# 7. Test AGENTE mid-booking
# - Iniciar booking flow
# - En paso 2: "AGENTE"
# - Verificar:
#   ✅ Flujo abortado
#   ✅ Escalamiento normal
#   ✅ flujoBot = null

# 8. Test admin citas
# - Admin → Citas → Crear cita manual
# - Pick prospecto, propiedad, asesor, slot libre
# - Confirmar
# - Verificar:
#   ✅ Cita creada CONFIRMADA
#   ✅ Cliente recibe WhatsApp confirmación

# 9. Test reminders
# - Crear cita CONFIRMADA en 1 hora
# - Esperar ~60 minutos
# - Verificar:
#   ✅ Cliente recibe recordatorio WhatsApp
#   ✅ Asesor recibe recordatorio WhatsApp
#   ✅ cita.recordatorioEnviadoAt populated

# 10. Test double-booking prevention
# - Try crear 2 citas mismo asesor mismo slot
# - Verify: segunda falla con 409 Conflict
```

---

## 📊 Estimación

| Componente | LOC | Tiempo estimado |
|------------|-----|-----------------|
| A) Escalamiento AGENTE | ~400 | 3-4 horas |
| B) Conversaciones Page | ~800 | 6-8 horas |
| C) Citas completo | ~3000 | 20-25 horas |
| Tests | ~1500 | 10-12 horas |
| **TOTAL** | **~5700** | **~40-50 horas** |

---

## 🚀 Próximos Pasos

Este documento sirve como blueprint. Daniel puede:

1. ✅ **Revisar el schema/migración** y aplicar cambios
2. ⏭️ **Continuar con implementación completa** (requiere múltiples sesiones)
3. 🔄 **Dividir en PRs separados**: A → B → C
4. 👥 **Asignar a múltiples agentes**: uno por feature

---

**Autor**: Agent Sonnet 4.5  
**Fecha**: 2026-11-24  
**Branch**: `cursor/inmueble-check-mvp-7fa5`
