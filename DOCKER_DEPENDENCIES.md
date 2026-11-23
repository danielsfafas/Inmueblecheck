# Gestión de Dependencias en Docker

## Volúmenes Anónimos de node_modules

El `docker-compose.yml` define volúmenes anónimos para `node_modules`:

```yaml
backend:
  volumes:
    - ./backend:/app
    - /app/node_modules  # <- Volumen anónimo

frontend:
  volumes:
    - ./frontend:/app
    - /app/node_modules  # <- Volumen anónimo
```

### ¿Por qué?

Los volúmenes anónimos evitan que `node_modules` del host (Windows/Mac) sobrescriban los `node_modules` compilados para Linux dentro del contenedor. Esto es especialmente importante para paquetes con binarios nativos.

### Agregar Nuevas Dependencias

Cuando agregues dependencias con `npm install` en tu host:

**Opción 1: Rebuild con volúmenes renovados (Recomendado)**
```bash
docker compose -p inmueblecheck up -d --build --renew-anon-volumes
```

**Opción 2: Instalar dentro del contenedor**
```bash
# Para backend
docker exec -it inmueblecheck-backend npm install <paquete>

# Para frontend
docker exec -it inmueblecheck-frontend npm install <paquete>
```

**Opción 3: Rebuild completo**
```bash
docker compose -p inmueblecheck down
docker compose -p inmueblecheck up -d --build
```

### Verificar Dependencias

```bash
# Backend
docker exec -it inmueblecheck-backend npm list multer

# Frontend
docker exec -it inmueblecheck-frontend npm list @eslint/js
```

### Notas Importantes

- ✅ **NO** es necesario borrar `postgres_data` al agregar dependencias
- ✅ Los volúmenes anónimos solo afectan `node_modules`
- ✅ Cambios en `package.json` requieren `--build --renew-anon-volumes`
- ✅ El flag `--renew-anon-volumes` recrea solo los volúmenes anónimos, no los nombrados

### Problemas Comunes

**"Cannot find package 'multer'"**
```bash
# El volumen anónimo tiene la versión anterior de node_modules
docker compose -p inmueblecheck up -d --build --renew-anon-volumes
```

**"ERESOLVE peer dependency conflict"**
```bash
# Las versiones de package.json son incompatibles
# Arreglar package.json primero, luego:
docker compose -p inmueblecheck up -d --build --renew-anon-volumes
```
