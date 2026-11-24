/**
 * Respaldo con IA para elegir una opción cuando el parser no está seguro.
 * Solo se activa si hay un proveedor real configurado (AI_PROVIDER distinto de
 * "simulado" y AI_API_KEY). Usa un endpoint compatible con OpenAI Chat Completions.
 * Si no hay proveedor, falla o tarda, devuelve null y el flujo vuelve a preguntar.
 */

const BASES = {
  openai: 'https://api.openai.com/v1',
  xai: 'https://api.x.ai/v1',
  grok: 'https://api.x.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
};

export function iaDisponible() {
  const proveedor = (process.env.AI_PROVIDER || '').toLowerCase();
  return Boolean(process.env.AI_API_KEY) && proveedor && proveedor !== 'simulado';
}

/**
 * @param {string} mensaje respuesta del cliente
 * @param {string[]} opciones textos de las opciones, en el orden mostrado
 * @param {string} pregunta qué se le preguntó al cliente
 * @returns {Promise<number|null>} índice 0-based o null
 */
export async function elegirOpcionConIA(mensaje, opciones, pregunta = 'Elige una opción') {
  if (!iaDisponible() || !opciones?.length) return null;
  const proveedor = process.env.AI_PROVIDER.toLowerCase();
  const base = (process.env.AI_BASE_URL || BASES[proveedor] || BASES.openai).replace(/\/+$/, '');
  const modelo = process.env.AI_MODEL || 'gpt-4o-mini';

  const lista = opciones.map((o, i) => `${i + 1}. ${o}`).join('\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0,
        max_tokens: 5,
        messages: [
          {
            role: 'system',
            content:
              'Eres un clasificador. Un cliente de una inmobiliaria responde por WhatsApp a una lista numerada. ' +
              'Devuelve SOLO el número de la opción que eligió, o 0 si no se puede saber. Sin texto extra.',
          },
          { role: 'user', content: `Pregunta: ${pregunta}\nOpciones:\n${lista}\n\nRespuesta del cliente: "${mensaje}"` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const texto = data?.choices?.[0]?.message?.content || '';
    const n = parseInt(String(texto).match(/\d+/)?.[0] ?? '0', 10);
    return n >= 1 && n <= opciones.length ? n - 1 : null;
  } catch (error) {
    console.warn('IA de respaldo no disponible:', error.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
