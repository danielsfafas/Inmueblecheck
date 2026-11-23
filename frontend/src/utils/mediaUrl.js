/**
 * Convierte rutas relativas de media (/uploads/...) a URLs absolutas del backend
 * Deja URLs absolutas (http://, https://) sin modificar
 * 
 * @param {string} path - Ruta del archivo (ej: '/uploads/seed/casa1.jpg')
 * @returns {string} - URL completa (ej: 'http://localhost:4311/uploads/seed/casa1.jpg')
 */
export function mediaUrl(path) {
  if (!path) return '';
  
  // Si ya es URL absoluta, devolver sin cambios
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Obtener base URL del backend desde VITE_API_URL
  // VITE_API_URL = 'http://localhost:4311/api'
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4311/api';
  
  // Extraer origin (http://localhost:4311) sin el /api
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  
  // Si path empieza con /, concatenar; si no, agregar /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
}
