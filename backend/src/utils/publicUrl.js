/**
 * URLs públicas que el bot comparte por WhatsApp.
 *
 * La base sale de PUBLIC_URL (si existe) o de FRONTEND_URL, que en producción
 * ya apunta al dominio real (p. ej. https://inmueblecheck.danysolutions.online).
 * Nunca se hardcodea un dominio.
 */
const BASE_POR_DEFECTO = 'http://localhost:5191';

export function obtenerBaseUrlPublica() {
  const base = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || BASE_POR_DEFECTO).trim();
  return base.replace(/\/+$/, '');
}

/**
 * Ficha pública de una propiedad (no requiere sesión).
 * Ruta del frontend: /i/:slug/propiedades/:id
 * Sin slug cae en /propiedades/:id, que el frontend redirige a la inmobiliaria por defecto.
 */
export function construirUrlPropiedad(propiedadId, inmobiliaria) {
  const base = obtenerBaseUrlPublica();
  const id = encodeURIComponent(String(propiedadId));
  const slug = inmobiliaria?.slug;
  if (slug) {
    return `${base}/i/${encodeURIComponent(slug)}/propiedades/${id}`;
  }
  return `${base}/propiedades/${id}`;
}
