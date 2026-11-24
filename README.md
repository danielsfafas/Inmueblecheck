# InmuebleCheck - Sistema de Gestión Inmobiliaria

MVP de SaaS multi-inmobiliaria para gestión de propiedades, prospectos y CRM inmobiliario, desarrollado por **DanySolutions** (Daniel, México).

## 🚀 Stack Tecnológico

- **Backend:** Node.js + Express + Prisma + PostgreSQL + Redis
- **Frontend:** React + Vite + TailwindCSS
- **Infraestructura:** Docker Compose para desarrollo local

## 📋 Requisitos Previos

- **Docker Desktop** instalado y ejecutándose en Windows
- **Git** instalado
- Puertos disponibles: 5191 (frontend), 4311 (backend), 5446 (PostgreSQL), 6391 (Redis)

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd inmueblecheck
```

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo y ajustar si es necesario:

```bash
copy .env.example .env
```

**Nota:** Las configuraciones por defecto funcionan correctamente para desarrollo local.

### 3. Levantar el proyecto con Docker

```bash
docker-compose up --build
```

Este comando:
- Construye las imágenes de Docker
- Levanta PostgreSQL en el puerto 5446
- Levanta Redis en el puerto 6391
- Levanta el backend en el puerto 4311 (y ejecuta migraciones automáticamente)
- Levanta el frontend en el puerto 5191

**Espera aproximadamente 2-3 minutos** la primera vez mientras se descargan las imágenes y se instalan las dependencias.

### 4. (Opcional) Cargar datos de demostración

**⚠️ IMPORTANTE:** Los datos de demostración incluyen contraseñas débiles y solo deben usarse en desarrollo local.

```bash
# Entrar al contenedor del backend
docker exec -it inmueblecheck-backend sh

# Ejecutar seed (idempotente, se puede correr múltiples veces)
npm run seed

# Salir del contenedor
exit
```

### 5. Acceder a la aplicación

Una vez que todo esté corriendo:

- **Frontend (sitio público):** http://localhost:5191
- **Panel de administración:** http://localhost:5191/login
- **API Backend:** http://localhost:4311

## 👤 Credenciales de Demostración

**⚠️ SOLO PARA DESARROLLO LOCAL** - Nunca usar estas contraseñas en producción.

El sistema viene con una inmobiliaria de ejemplo en **Tepeapulco y Ciudad Sahagún, Hidalgo**.

### Usuarios de demostración (después de correr `npm run seed`):

| Rol | Email | Contraseña | Descripción |
|-----|-------|------------|-------------|
| Administrador | admin@casashidalgo.com.mx | Demo2024! | Acceso completo |
| Ejecutivo | maria.lopez@casashidalgo.com.mx | Demo2024! | Gestión de prospectos |
| Ejecutivo | carlos.garcia@casashidalgo.com.mx | Demo2024! | Gestión de prospectos |

### Datos de demostración incluidos:

- ✅ 1 inmobiliaria: **Casas Hidalgo**
- ✅ 3 usuarios (1 admin, 2 ejecutivos)
- ✅ 8 propiedades (casas, departamentos, local, terreno)
- ✅ 5 prospectos en diferentes etapas del embudo
- ✅ Actividades, conversaciones y consentimientos de ejemplo

## 📁 Estructura del Proyecto

```
inmueblecheck/
├── backend/              # API Node.js + Express
│   ├── prisma/
│   │   ├── schema.prisma # Modelos de base de datos
│   │   └── seed.js       # Datos de demostración
│   ├── src/
│   │   ├── routes/       # Rutas de la API
│   │   ├── services/     # Lógica de negocio
│   │   ├── middleware/   # Autenticación, errores
│   │   └── index.js      # Punto de entrada
│   └── __tests__/        # Pruebas unitarias
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── pages/        # Páginas públicas y dashboard
│   │   ├── components/   # Componentes reutilizables
│   │   ├── stores/       # Estado global (Zustand)
│   │   ├── services/     # Cliente API
│   │   └── utils/        # Utilidades y formatters
├── docker-compose.yml    # Orquestación de servicios
└── .env.example          # Variables de entorno de ejemplo
```

## ⚡ Funcionalidades del MVP

### 1. Catálogo Público de Viviendas
- ✅ Galería de fotos por propiedad
- ✅ Filtros: zona, precio, tipo, recámaras, forma de pago
- ✅ Precio en MXN, venta/renta, características
- ✅ Créditos aceptados: contado, bancario, Infonavit, Fovissste
- ✅ Estado: disponible, apartada, vendida
- ✅ Ubicación aproximada en mapa
- ✅ Botón de WhatsApp con propiedad identificada
- ✅ Contador de vistas y clics

### 2. Sistema de Prospectos
- ✅ Formulario de captación con datos financieros
- ✅ Calificación automática: caliente, tibio o frío
- ✅ Basada en presupuesto y crédito preaprobado
- ✅ Registro de origen (Facebook, Instagram, etc.)
- ✅ Consentimientos expresos para datos financieros

### 3. Bot de WhatsApp con IA (Modo Simulado)
- ✅ Primer mensaje identifica como asistente virtual
- ✅ Respuestas automáticas a consultas generales
- ✅ Comando **AGENTE** para pasar a humano
- ✅ Comando **BAJA** para darse de baja (REPEP)
- ✅ Resumen de conversación al pasar a ejecutivo
- ✅ Interfaz simulada que funciona sin credenciales

### 4. Panel de Administración (CRM)
- ✅ Dashboard con métricas principales
- ✅ Embudo tipo kanban (nuevo, contactado, visita, oferta, apartado, cerrado)
- ✅ Historial de cada prospecto (mensajes, llamadas, visitas, notas)
- ✅ Propiedades vistas por prospecto
- ✅ Reparto de prospectos entre ejecutivos

### 5. Sistema de Recordatorios
- ✅ Crear recordatorio al registrar actividad
- ✅ Vista de próximos recordatorios
- ✅ Alertas de recordatorios vencidos
- ✅ Visible para supervisores
- ✅ Marcar como completado

### 6. Publicación en Redes (Simulado)
- ✅ Interfaz para generar contenido
- ✅ Vista previa de post vertical
- ✅ Preparado para integración futura con Meta y TikTok

### 7. Reportes Básicos
- ✅ Prospectos nuevos por período
- ✅ Visitas y cierres por ejecutivo
- ✅ Tiempo promedio de respuesta
- ✅ Distribución por etapa y calificación
- ✅ Propiedades más vistas

## 🔒 Cumplimiento Legal (LFPDPPP, NOM-247, PROFECO)

El sistema implementa los requisitos legales según el checklist de **Mi Lic.**:

### ✅ Implementado en el MVP:

- **Multi-tenant:** Aislamiento total por inmobiliaria
- **Datos legales configurables:** Sin hardcoding, editable desde panel
- **Bloqueo de publicación:** Si falta domicilio del responsable
- **Aviso de privacidad simplificado:** En todos los formularios
- **Consentimientos registrados:** Fecha UTC, IP, navegador, versión del documento
- **Consentimiento expreso para datos financieros:** Casilla no premarcada
- **Leyendas PROFECO y NOM-247:** Configurables por inmobiliaria
- **Banner de cookies:** Acepta antes de cargar píxeles de seguimiento
- **Bot de WhatsApp conforme:**
  - Avisa que es asistente virtual
  - Enlace a aviso de privacidad
  - Comando AGENTE para pasar a humano
  - Comando BAJA para darse de baja
  - Nunca pide INE ni tarjeta
- **Lista de no contactar (REPEP):** Bloquea mensajes promocionales
- **Inmobiliaria como responsable:** Textos reflejan que DanySolutions solo provee la plataforma

### Colección de Consentimientos

Tabla `Consentimiento` con:
- Inmobiliaria (tenant)
- Prospecto (opcional)
- Titular
- Tipo (aviso_privacidad, datos_financieros, transferencias, opt-in WhatsApp, cookies, etc.)
- Acción (otorga, revoca, baja)
- Versión del documento
- Hash del texto
- Canal (web, whatsapp, etc.)
- IP, User-Agent, Fecha UTC

## 🧪 Ejecutar Pruebas

```bash
# Entrar al contenedor del backend
docker exec -it inmueblecheck-backend sh

# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch
npm run test:watch
```

### Pruebas incluidas:

1. **Sistema de calificación de prospectos**
   - Calificación CALIENTE (>= 1M o >= 800K crédito)
   - Calificación TIBIO (>= 500K o >= 400K crédito)
   - Calificación FRIO (resto)

2. **Bot de WhatsApp**
   - Detección de comandos BAJA, STOP, CANCELAR
   - Detección de comandos AGENTE, HUMANO, ASESOR
   - Pase a ejecutivo humano
   - Generación de resumen de conversación

3. **Sistema de recordatorios**
   - Identificación de recordatorios vencidos
   - Recordatorios pendientes futuros
   - Marcar como completado

4. **Sistema de consentimientos**
   - Validación de campos requeridos
   - Generación de hash del texto
   - Verificación de datos financieros
   - Registro de IP y user-agent
   - Acciones: otorga, revoca, baja

## 🔧 Comandos Útiles

### Detener todos los servicios

```bash
docker-compose down
```

### Ver logs de un servicio específico

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Reiniciar un servicio

```bash
docker-compose restart backend
```

### Limpiar base de datos y volver a empezar

```bash
docker-compose down -v  # Elimina volúmenes
docker-compose up --build
# Luego ejecutar migraciones y seed nuevamente
```

### Acceder a PostgreSQL

```bash
docker exec -it inmueblecheck-postgres psql -U inmueblecheck -d inmueblecheck
```

## 🌐 Localización

- **Idioma:** Español de México
- **Moneda:** MXN (Peso Mexicano)
- **Zona horaria:** America/Mexico_City
- **Formato de fecha:** dd/MM/yyyy
- **Formato de moneda:** $1,234,567 MXN

## 📱 Responsive Design

La interfaz pública y el panel de administración son completamente responsivos:
- Mobile-first en catálogo público
- Sidebar colapsable en panel de administración
- Tablas con scroll horizontal en móvil
- Optimizado para tablets y desktop

## 🚧 Pendientes Fase 2

Ver archivo [FASE_2.md](./FASE_2.md) para la lista completa de funcionalidades pendientes.

Principales pendientes:
- Integración real con WhatsApp Cloud API
- Integración real con proveedores de IA (OpenAI, Anthropic, Gemini)
- Generación real de videos verticales
- Publicación directa en Meta y TikTok
- Módulo de expediente digital (INE, comprobantes)
- Alertas antilavado (LFPIORPI)
- Módulo de apartado con tarjeta
- Portal de propietarios
- Envío real de plantillas de WhatsApp fuera de ventana de 24h

## 📄 Licencia

Este proyecto es de uso privado para **DanySolutions**. Todos los derechos reservados.

---

**Desarrollado por DanySolutions**  
Versión: 1.0.0 MVP  
Fecha: Noviembre 2026
