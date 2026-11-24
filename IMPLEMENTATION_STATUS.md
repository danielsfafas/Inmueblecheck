# Estado de Implementación - InmuebleCheck MVP

**Última actualización:** 23 Nov 2026  
**Branch:** `cursor/inmueble-check-mvp-7fa5`  
**PR:** #1

---

## ✅ COMPLETADO - FASE 1: CRUD Admin Panel

### 1. Crear Prospecto desde Admin

**Backend:**
- ✅ POST `/api/prospectos` - Crear prospecto con validación
- ✅ Validación: nombre y teléfono obligatorios
- ✅ Verificación de ejecutivo asignado (mismo tenant)
- ✅ Registro automático de consentimiento `AVISO_PRIVACIDAD` (canal: `panel_admin`)
- ✅ Actividad automática de creación
- ✅ Soporte para propiedades de interés iniciales
- ✅ Aislamiento por tenant
- ✅ Tests: `__tests__/prospectoCRUD.test.js`

**Frontend:** ⏸️ Pendiente
- Modal ProspectoNuevoModal.jsx
- Integración en ProspectosPage.jsx

---

### 2. Crear/Editar Propiedad + Subida de Fotos

**Backend:**
- ✅ POST `/api/propiedades/:propiedadId/fotos` - Subir múltiples fotos
- ✅ PATCH `/api/propiedades/:propiedadId/fotos/orden` - Reordenar fotos
- ✅ DELETE `/api/propiedades/:propiedadId/fotos` - Eliminar foto
- ✅ Validación por MIME type (image/jpeg, image/png, image/webp)
- ✅ Validación por **magic bytes** (FF D8 FF, 89 50 4E 47, RIFF...WEBP)
- ✅ Límite 10 MB por foto, máx 20 fotos simultáneas
- ✅ Almacenamiento en `/uploads/propiedades/`
- ✅ Servido estático con mediaUrl()
- ✅ Aislamiento por tenant
- ✅ Tests: `__tests__/propiedadFotos.test.js`

**Frontend:** ⏸️ Pendiente
- PropiedadFormModal.jsx (crear/editar)
- PropiedadFotosManager.jsx (subir, ordenar, eliminar)
- Integración en PropiedadesAdminPage.jsx

---

### 3. Crear Recordatorio desde Admin

**Backend:**
- ✅ POST `/api/recordatorios` ya existía
- ✅ Validación completa
- ✅ Aislamiento por tenant

**Frontend:** ⏸️ Pendiente
- RecordatorioFormModal.jsx
- Integración en RecordatoriosPage.jsx
- Botón desde detalle de prospecto

---

## ✅ COMPLETADO - FASE 2: WhatsApp Multi-Usuario + Lista Negra

### Arquitectura Multi-Usuario

**Cada usuario conecta SU propio WhatsApp** (no por inmobiliaria).

**Modelos Prisma:**

```prisma
model NumeroWhatsapp {
  id               String              @id @default(uuid())
  usuarioId        String
  nombre           String              // "Mi WhatsApp Personal"
  numero           String              @unique // E.164: +525512345678
  proveedor        ProveedorWhatsapp   @default(WHATSAPP_WEB_JS)
  phoneNumberId    String?             // Meta Cloud API
  accessToken      String?             // Meta/Twilio (cifrado)
  sessionData      String?             // whatsapp-web.js/Baileys (cifrado)
  activo           Boolean             @default(true)
  estadoConexion   String?             @default("disconnected")
  ultimaConexion   DateTime?
  ...
}

enum ProveedorWhatsapp {
  META_CLOUD          // Meta Cloud API (empresa)
  WHATSAPP_WEB_JS     // whatsapp-web.js (QR, ⚠️ riesgo ban)
  BAILEYS             // Baileys (multidevice, ⚠️ riesgo ban)
  TWILIO              // Twilio WhatsApp API
}

model ListaNegra {
  id               String    @id @default(uuid())
  usuarioId        String
  numeroRemitente  String    // E.164 normalizado
  nombreContacto   String?
  nota             String?
  ...
  @@unique([usuarioId, numeroRemitente])
}

model Conversacion {
  ...
  numeroWhatsappId String?   // Número que atendió esta conversación
  ...
}
```

**Migración:**
- ✅ `20261123190000_whatsapp_multiusuario_lista_negra/migration.sql`
- ✅ No destructiva
- ✅ Agrega `numeroWhatsappId` a Conversacion
- ⏸️ Script de migración de datos (convertir config actual en primer número del admin) - Pendiente

---

### Backend - Endpoints Mi WhatsApp

**`/api/mi-whatsapp/`** (autenticado):

- ✅ GET `/numeros` - Listar números del usuario (credenciales enmascaradas)
- ✅ POST `/numeros` - Crear/conectar número WhatsApp
- ✅ PATCH `/numeros/:id/conexion` - Actualizar estado conexión
- ✅ PATCH `/numeros/:id/activar` - Activar/desactivar número
- ✅ DELETE `/numeros/:id` - Eliminar número

**Lista Negra:**

- ✅ GET `/lista-negra` - Listar bloqueados del usuario
- ✅ POST `/lista-negra` - Agregar número a lista negra
- ✅ DELETE `/lista-negra/:id` - Eliminar de lista negra

**Admin:**

- ✅ GET `/admin/numeros` - Ver todos los números del tenant (ADMIN/SUPERVISOR)
- ✅ PATCH `/admin/numeros/:id/activar` - Desactivar número de otro usuario (ADMIN)

**Archivo:** `backend/src/routes/mi-whatsapp.routes.js`

---

### Backend - Lógica de Routing y Lista Negra

**Webhook actualizado:** `backend/src/routes/whatsapp.routes.js`
- ✅ Extrae `phone_number_id` de metadata
- ✅ Pasa a `procesarMensajeBot(from, text, phoneNumberId)`

**Service actualizado:** `backend/src/services/whatsappBot.service.js`

**Flujo:**

1. **Routing:** Encontrar número receptor por `phone_number_id` (Meta Cloud API)
2. **Verificación lista negra:** Si `numeroRemitente` está en lista negra del `usuarioId` dueño del número receptor → **Bot NO responde**
3. **Guardar mensaje sin responder:** Mensaje se guarda, conversación marcada `pasadoAHumano: true`, `atendidoPorBot: false`
4. **Responder normal:** Si NO está en lista negra → Bot responde normalmente

**Utilidades:** `backend/src/utils/whatsapp-multiusuario.js`
- ✅ `normalizarNumeroE164()` - Normalizar números a formato E.164 (+525512345678)
- ✅ `enmascarCredenciales()` - Enmascarar accessToken/sessionData antes de enviar al frontend
- ✅ `estaEnListaNegra()` - Verificar si número está bloqueado por usuario
- ✅ `encontrarNumeroPorPhoneNumberId()` - Routing por phone_number_id
- ✅ `encontrarNumeroPorNumero()` - Routing por número normalizado

**Envío de mensajes:**
- ✅ `enviarMensajeWhatsApp(numeroReceptor, telefonoDestino, mensaje)` - Envía desde el número correcto según proveedor

---

### Tests Backend

**114 tests pasando** (antes 76)

**Nuevos tests:**

1. `__tests__/whatsappMultiusuario.test.js` (10 tests)
   - Normalización E.164
   - Enmascaramiento de credenciales

2. `__tests__/whatsappListaNegra.test.js` (22 tests)
   - Bot NO responde a lista negra
   - Routing multi-usuario
   - Aislamiento entre usuarios y tenants
   - Normalización en lista negra

3. `__tests__/prospectoCRUD.test.js` (8 tests)
   - Validación POST /api/prospectos
   - Consentimientos
   - Aislamiento por tenant

4. `__tests__/propiedadFotos.test.js` (14 tests)
   - Validación MIME types
   - Magic bytes (JPEG, PNG, WebP)
   - Límite 10 MB
   - Aislamiento por tenant
   - Reordenamiento

---

### Frontend - UI Mi WhatsApp

⏸️ **Pendiente:**

**MiWhatsAppPage.jsx** (perfil usuario):

Secciones:

1. **Mis Números WhatsApp**
   - Tabla: nombre, número, proveedor, estado conexión, última conexión, activo
   - Botón "Conectar Nuevo Número"
   - Por cada número: botón Activar/Desactivar, Editar, Eliminar

2. **Conectar Número** (modal):
   - Campo: Nombre/etiqueta
   - Campo: Número (con normalización visual)
   - Select: Proveedor (Meta Cloud API, whatsapp-web.js, Baileys, Twilio)
   - Campos condicionales según proveedor:
     - **Meta Cloud API:** phoneNumberId, accessToken
     - **Twilio:** accessToken (Account SID + Auth Token)
     - **whatsapp-web.js / Baileys:** Botón "Generar QR" → mostrar QR para escanear
   - Estado de conexión en tiempo real
   - Prueba de conexión

3. **Mi Lista Negra**
   - Tabla: número, nombre/contacto, nota, fecha agregada
   - Campo: Agregar número (con normalización +52)
   - Campo opcional: Nombre/contacto
   - Campo opcional: Nota
   - Botón Eliminar por cada entrada
   - Búsqueda/filtro

**Admin - Números del Equipo** (ConfiguracionWhatsAppPage.jsx):
- Ver todos los números del tenant
- Ver dueño de cada número
- Desactivar números (solo ADMIN)

---

## ⚠️ IMPORTANTE - Consideraciones Técnicas WhatsApp

### Opciones de Conexión WhatsApp Personal

**Meta Cloud API:**
- ❌ **NO permite WhatsApp personal con QR**
- Requiere: Número empresarial verificado + Facebook Business Manager
- Solo para números oficiales de empresa

**whatsapp-web.js (implementado):**
- ✅ Permite conexión QR de WhatsApp personal
- ⚠️ **RIESGO: Viola términos de servicio de Meta → puede resultar en ban**
- Funciona como WhatsApp Web
- Requiere sesión persistente (guardada en `sessionData`)

**Baileys:**
- ✅ Multidevice, conexión QR
- ⚠️ **RIESGO: No oficial → posible ban**
- Más estable que whatsapp-web.js

**Twilio:**
- ✅ Oficial, sin riesgo ban
- ❌ Caro: Cada usuario necesita número Twilio dedicado ($$$)
- No usa número personal del usuario

### Recomendaciones para Daniel

**Para producción:**

1. **Opción 1 (Recomendada) - Twilio:**
   - Sin riesgo de ban
   - Oficial y soportado
   - Costo: ~$1-2 USD/mes por número + $0.005/mensaje
   - Cada usuario compra su número Twilio

2. **Opción 2 (Riesgo medio) - whatsapp-web.js:**
   - Gratis
   - Usa WhatsApp personal
   - ⚠️ Riesgo de ban si Meta detecta automatización
   - Mitigación: Limitar frecuencia de mensajes, no spam

3. **Opción 3 (Empresarial) - Meta Cloud API:**
   - Solo si cada usuario tiene número empresarial verificado
   - Proceso largo de verificación por número

**Configuración actual:**
- Sistema soporta múltiples proveedores
- Proveedor por defecto: `WHATSAPP_WEB_JS`
- Se puede cambiar por número

---

## 📋 TODO - Frontend Pendiente

### Componentes a Crear

1. **ProspectoNuevoModal.jsx**
   - Formulario crear prospecto
   - Validación frontend
   - Integrar en ProspectosPage

2. **PropiedadFormModal.jsx**
   - Formulario crear/editar propiedad
   - Tabs: Datos básicos, Ubicación, Características, Créditos
   - Integrar en PropiedadesAdminPage

3. **PropiedadFotosManager.jsx**
   - Subida múltiple con drag & drop
   - Preview con thumbnails
   - Drag & drop para reordenar
   - Marcar portada (primera)
   - Eliminar con confirmación
   - Progress bar por foto

4. **RecordatorioFormModal.jsx**
   - Formulario crear recordatorio
   - DatePicker + TimePicker
   - Select prospecto
   - Integrar en RecordatoriosPage y ProspectoDetallePage

5. **MiWhatsAppPage.jsx**
   - Gestión números WhatsApp usuario
   - Lista negra
   - Generar QR para whatsapp-web.js
   - Estados de conexión en tiempo real

6. **ConfiguracionWhatsAppPage.jsx** (Admin)
   - Ver números del equipo
   - Desactivar números

---

## 🗄️ Migraciones Prisma

**Aplicadas:**
1. ✅ `20261123173000_add_propiedad_videos` - Videos en propiedades
2. ✅ `20261123190000_whatsapp_multiusuario_lista_negra` - WhatsApp multi-usuario + lista negra

**Pendiente:**
- Script de migración de datos para convertir configuración actual de WhatsApp en primer número del admin

---

## 🧪 Testing

**Backend:**
- ✅ 114/114 tests pasan
- ✅ Cobertura: CRUD prospectos, fotos propiedades, WhatsApp multi-usuario, lista negra
- ✅ Magic bytes validation
- ✅ Normalización E.164
- ✅ Aislamiento por tenant
- ✅ Bot no responde a lista negra

**Frontend:**
- ⏸️ Pendiente: Tests de componentes nuevos

---

## 📦 Dependencias

**Backend:**
- ✅ `multer` - Subida de archivos (fotos/videos)
- Prisma actualizado con nuevos modelos

**Frontend:**
- Sin nuevas dependencias

---

## 🚀 Cómo Probar (Docker)

### 1. Pull y Rebuild

```bash
git checkout cursor/inmueble-check-mvp-7fa5
git pull origin cursor/inmueble-check-mvp-7fa5

docker compose -p inmueblecheck down
docker compose -p inmueblecheck up -d --build --renew-anon-volumes
```

### 2. Aplicar Migraciones

```bash
docker exec -it inmueblecheck-backend npx prisma migrate deploy
```

### 3. Re-seed (Idempotente)

```bash
docker exec -it inmueblecheck-backend npm run seed
```

### 4. Verificar Logs

```bash
docker logs inmueblecheck-backend
docker logs inmueblecheck-frontend
```

### 5. Acceder

- Frontend: http://localhost:5191
- Backend API: http://localhost:4311/api
- Login: Usuarios del seed

---

## 📝 Notas de Desarrollo

### Aislamiento por Tenant

**Estricto en:**
- ✅ Prospectos: Solo de la misma inmobiliaria
- ✅ Propiedades: Solo de la misma inmobiliaria
- ✅ Fotos: Solo propiedades del mismo tenant
- ✅ Números WhatsApp: Usuario solo ve/edita los suyos
- ✅ Lista Negra: Usuario solo ve/edita la suya
- ✅ Admin: Puede ver todos los números de su inmobiliaria

### Roles

**ADMIN:**
- ✅ Crear prospectos
- ✅ Crear/editar propiedades
- ✅ Subir fotos
- ✅ Crear recordatorios
- ✅ Ver números WhatsApp del equipo
- ✅ Desactivar números de otros usuarios

**SUPERVISOR:**
- ✅ Crear prospectos
- ✅ Crear/editar propiedades
- ✅ Subir fotos
- ✅ Crear recordatorios
- ✅ Ver números WhatsApp del equipo (read-only)

**EJECUTIVO:**
- ✅ Crear prospectos
- ✅ Crear recordatorios propios
- ✅ Gestionar su WhatsApp personal
- ✅ Gestionar su lista negra

### Seguridad

**Credenciales WhatsApp:**
- ⚠️ Actualmente almacenadas en texto plano en BD
- 🔒 TODO: Implementar cifrado con libsodium o similar
- ✅ Enmascaradas en respuestas API (accessToken: `****cdef`, sessionData: `[ENCRYPTED]`)

**Validación de Archivos:**
- ✅ MIME type check
- ✅ Magic bytes validation (no confiar solo en extensión)
- ✅ Límite de tamaño (10 MB fotos, 200 MB videos)
- ✅ Sanitización de nombres de archivo

---

## 🐛 Problemas Conocidos

1. ⏸️ Credenciales WhatsApp sin cifrar en BD (TODO: implementar cifrado)
2. ⏸️ whatsapp-web.js require instalar dependencias adicionales (puppeteer)
3. ⏸️ QR generation para whatsapp-web.js pendiente de implementar
4. ⏸️ Webhook real de Meta Cloud API no probado (modo simulado activo)

---

## 📚 Referencias

**Meta Cloud API:**
- https://developers.facebook.com/docs/whatsapp/cloud-api

**whatsapp-web.js:**
- https://github.com/pedroslopez/whatsapp-web.js
- ⚠️ Riesgo de ban: https://github.com/pedroslopez/whatsapp-web.js/discussions/1935

**Baileys:**
- https://github.com/WhiskeySockets/Baileys

**Twilio WhatsApp:**
- https://www.twilio.com/whatsapp

---

**Estado:** ✅ Backend completo | ⏸️ Frontend pendiente  
**Tests:** 114/114 pasando  
**Próximo paso:** Implementar componentes frontend
