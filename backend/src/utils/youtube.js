/**
 * Extrae el ID de video de YouTube de diferentes formatos de URL
 * @param {string} url - URL de YouTube
 * @returns {string|null} - ID del video o null si no es válida
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Limpiar espacios
  url = url.trim();

  // Patrones soportados:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/shorts/VIDEO_ID
  // https://m.youtube.com/watch?v=VIDEO_ID

  const patterns = [
    // youtube.com/watch?v=...
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // youtu.be/...
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // youtube.com/shorts/...
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Valida si una URL es de YouTube
 * @param {string} url - URL a validar
 * @returns {boolean}
 */
export function isYouTubeUrl(url) {
  return extractYouTubeId(url) !== null;
}

/**
 * Genera URL de embed de YouTube con youtube-nocookie.com
 * @param {string} videoId - ID del video de YouTube
 * @param {boolean} isShort - Si es un Short (9:16) vs video normal (16:9)
 * @returns {string}
 */
export function getYouTubeEmbedUrl(videoId, isShort = false) {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

/**
 * Detecta si una URL de YouTube es un Short
 * @param {string} url - URL de YouTube
 * @returns {boolean}
 */
export function isYouTubeShort(url) {
  return url.includes('/shorts/');
}
