/**
 * Interpreta respuestas libres del cliente dentro de flujos con opciones
 * numeradas (propiedad, día, hora, confirmación).
 *
 * Entiende: "6", "la 6", "opción 6", "la seis", "el número 6", "6.", "quiero la 6",
 * ordinales ("la sexta", "la última"), nombres o parte del nombre de la opción
 * ("la casa amplia", "Tepeapulco La Morena"), y para fechas "hoy", "mañana",
 * "pasado mañana", "el viernes", "el 26", "26 de noviembre". Para horas
 * "a las 10", "10:30", "4 pm", "4 de la tarde".
 *
 * Cada función devuelve { indice } (0-based) cuando entiende con seguridad,
 * { candidatos: [indices] } cuando hay ambigüedad, o null si no entiende.
 */

const NUMEROS = {
  uno: 1, una: 1, primero: 1, primera: 1, primer: 1,
  dos: 2, segundo: 2, segunda: 2,
  tres: 3, tercero: 3, tercera: 3, tercer: 3,
  cuatro: 4, cuarto: 4, cuarta: 4,
  cinco: 5, quinto: 5, quinta: 5,
  seis: 6, sexto: 6, sexta: 6,
  siete: 7, septimo: 7, septima: 7, setimo: 7, setima: 7,
  ocho: 8, octavo: 8, octava: 8,
  nueve: 9, noveno: 9, novena: 9,
  diez: 10, decimo: 10, decima: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
};

// "una"/"uno" son muy comunes ("quiero una cita"): solo cuentan como número
// si van precedidas de un marcador de opción o son la respuesta completa.
const NUMEROS_AMBIGUOS = new Set(['uno', 'una', 'primer']);
const MARCADORES_OPCION = new Set(['la', 'el', 'opcion', 'numero', 'num', 'nro']);
const UNIDADES_NO_OPCION = /^(rec|recs|recamara|recamaras|habitacion|habitaciones|cuarto|cuartos|bano|banos|m2|metros|mil|millon|millones|pesos|personas|autos|cajones|pisos|niveles)$/;

const STOPWORDS = new Set([
  'la', 'el', 'los', 'las', 'de', 'del', 'en', 'con', 'y', 'a', 'al', 'un', 'una', 'que', 'me', 'mi',
  'quiero', 'quisiera', 'prefiero', 'elijo', 'escojo', 'opcion', 'numero', 'por', 'favor', 'esa', 'ese',
  'esta', 'este', 'para', 'ver', 'visitar', 'gustaria', 'interesa', 'porfa', 'pls', 'gracias', 'si',
]);

const DIAS_SEMANA = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7,
  septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9:#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(texto) {
  const n = normalizar(texto);
  return n ? n.split(' ') : [];
}

/**
 * Extrae el número de opción que el cliente eligió ("la 6", "opción seis", "la sexta", "la última").
 * Devuelve un entero o null. Ignora números que son cantidades ("3 recámaras").
 */
export function extraerNumeroOpcion(texto, totalOpciones = Infinity) {
  const toks = tokens(texto);
  if (toks.length === 0) return null;

  const encontrados = [];
  toks.forEach((tok, i) => {
    const anterior = toks[i - 1];
    const siguiente = toks[i + 1];
    let valor = null;

    const limpio = tok.replace(/^#/, '');
    if (/^\d{1,3}$/.test(limpio)) {
      valor = parseInt(limpio, 10);
    } else if (/^\d{1,2}(ra|da|ta|va|na|ma|ro|do|to|vo|no|mo|a|o)$/.test(limpio)) {
      valor = parseInt(limpio, 10); // "6ta", "1ra"
    } else if (NUMEROS[limpio] !== undefined) {
      if (NUMEROS_AMBIGUOS.has(limpio) && toks.length > 1 && !MARCADORES_OPCION.has(anterior)) return;
      valor = NUMEROS[limpio];
    } else if ((limpio === 'ultima' || limpio === 'ultimo') && Number.isFinite(totalOpciones)) {
      valor = totalOpciones;
    } else if (limpio === 'penultima' || limpio === 'penultimo') {
      if (Number.isFinite(totalOpciones)) valor = totalOpciones - 1;
    }

    if (valor === null) return;
    if (siguiente && UNIDADES_NO_OPCION.test(siguiente)) return; // "3 recámaras"
    encontrados.push(valor);
  });

  const unicos = [...new Set(encontrados)];
  if (unicos.length !== 1) return null;
  return unicos[0];
}

/**
 * Elige una opción por número o por nombre.
 * @param {string} texto respuesta del cliente
 * @param {Array<{etiqueta: string, alias?: string[]}>} opciones en el mismo orden mostrado
 */
export function interpretarOpcion(texto, opciones) {
  const total = opciones.length;
  if (!total || !normalizar(texto)) return null;

  const numero = extraerNumeroOpcion(texto, total);
  if (numero !== null) {
    if (numero >= 1 && numero <= total) return { indice: numero - 1, via: 'numero' };
    return { fueraDeRango: numero };
  }

  return interpretarPorNombre(texto, opciones);
}

function coincide(tokMensaje, tokOpcion) {
  if (tokMensaje === tokOpcion) return true;
  // Prefijos razonables: "tepea" ~ "tepeapulco", "depa" ~ "departamento"
  if (tokMensaje.length >= 4 && tokOpcion.startsWith(tokMensaje)) return true;
  if (tokOpcion.length >= 4 && tokMensaje.startsWith(tokOpcion)) return true;
  return false;
}

export function interpretarPorNombre(texto, opciones) {
  const msgToks = tokens(texto).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  if (msgToks.length === 0) return null;

  const opcToks = opciones.map((o) => {
    const base = tokens([o.etiqueta, ...(o.alias || [])].join(' ')).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    return [...new Set(base)];
  });

  // Peso tipo IDF: palabras que aparecen en todas las opciones ("casa") pesan poco.
  const n = opciones.length;
  const peso = (tok) => {
    const df = opcToks.filter((ts) => ts.some((t) => coincide(tok, t))).length;
    if (df === 0) return 0;
    return Math.log((n + 1) / df);
  };

  const puntajes = opcToks.map((ts) => msgToks.reduce((acc, tok) => (ts.some((t) => coincide(tok, t)) ? acc + peso(tok) : acc), 0));
  const max = Math.max(...puntajes);
  if (max <= 0) return null;

  const empatados = puntajes.map((p, i) => [p, i]).filter(([p]) => p >= max - 1e-9).map(([, i]) => i);
  if (empatados.length === 1) {
    const segundo = Math.max(...puntajes.filter((_, i) => i !== empatados[0]), 0);
    if (segundo === 0 || max >= segundo * 1.3) return { indice: empatados[0], via: 'nombre' };
    const cercanos = puntajes.map((p, i) => [p, i]).filter(([p]) => p >= max * 0.77).map(([, i]) => i);
    return { candidatos: cercanos };
  }
  return { candidatos: empatados };
}

// ---------- Fechas ----------

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sumarDias(d, n) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Elige un día de la lista mostrada.
 * @param {string} texto
 * @param {Date[]} fechas días ofrecidos (en orden)
 * @param {Date} hoy fecha de referencia (hora local de la inmobiliaria)
 * @returns {{indice:number}|{noDisponible:true, fecha:Date}|{candidatos:number[]}|null}
 */
export function interpretarFecha(texto, fechas, hoy = new Date()) {
  const n = normalizar(texto);
  if (!n || fechas.length === 0) return null;
  const toks = n.split(' ');
  const lista = fechas.map((f) => ymd(f));
  const buscar = (fecha) => {
    const idx = lista.indexOf(ymd(fecha));
    return idx >= 0 ? { indice: idx, via: 'fecha' } : { noDisponible: true, fecha };
  };

  // Relativos
  if (/\bpasado manana\b/.test(n)) return buscar(sumarDias(hoy, 2));
  if (/\bmanana\b/.test(n) && !/\b(en|por|de) la manana\b/.test(n)) return buscar(sumarDias(hoy, 1));
  if (/\bhoy\b/.test(n)) return buscar(hoy);

  // Día del mes con mes explícito: "26 de noviembre"
  const conMes = n.match(/\b(\d{1,2}) de ([a-z]+)\b/);
  if (conMes && MESES[conMes[2]] !== undefined) {
    const dia = parseInt(conMes[1], 10);
    const mes = MESES[conMes[2]];
    const idx = fechas.findIndex((f) => f.getDate() === dia && f.getMonth() === mes);
    if (idx >= 0) return { indice: idx, via: 'fecha' };
    let anio = hoy.getFullYear();
    if (mes < hoy.getMonth()) anio += 1;
    return { noDisponible: true, fecha: new Date(anio, mes, dia) };
  }

  // Día de la semana: "el viernes", "el próximo lunes"
  const diaSemana = toks.find((t) => DIAS_SEMANA[t] !== undefined);
  if (diaSemana) {
    const objetivo = DIAS_SEMANA[diaSemana];
    const idx = fechas.findIndex((f) => f.getDay() === objetivo);
    if (idx >= 0) return { indice: idx, via: 'fecha' };
    let delta = (objetivo - hoy.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    return { noDisponible: true, fecha: sumarDias(hoy, delta) };
  }

  // "el 26", "el día 26": número = día del mes. "la 6", "opción 6", "6": número de opción.
  const diaMes = n.match(/\b(?:el|dia)\s+(?:dia\s+)?(\d{1,2})\b/);
  if (diaMes && !/\b(opcion|numero)\b/.test(n)) {
    const dia = parseInt(diaMes[1], 10);
    const idx = fechas.findIndex((f) => f.getDate() === dia);
    if (idx >= 0) return { indice: idx, via: 'fecha' };
    if (dia > fechas.length) return { noDisponible: true, fecha: null, dia };
  }

  const numero = extraerNumeroOpcion(texto, fechas.length);
  if (numero !== null) {
    if (numero >= 1 && numero <= fechas.length) return { indice: numero - 1, via: 'numero' };
    // Número que no es opción pero sí día del mes ofrecido: "26"
    const idx = fechas.findIndex((f) => f.getDate() === numero);
    if (idx >= 0) return { indice: idx, via: 'fecha' };
    return { fueraDeRango: numero };
  }
  return null;
}

// ---------- Horas ----------

/**
 * Elige una hora de la lista mostrada ("09:00", "10:00", ...).
 */
export function interpretarHora(texto, horas) {
  const n = normalizar(texto);
  if (!n || horas.length === 0) return null;

  const pm = /\b(pm|p m|tarde|noche)\b/.test(n);
  const am = /\b(am|a m)\b/.test(n) || /\bde la manana\b/.test(n);
  const hhmm = n.match(/\b(\d{1,2}):(\d{2})\b/);
  const pareceHora = Boolean(hhmm) || pm || am || /\b(a las|las)\s+\d/.test(n) || /\ba la una\b/.test(n) || /\b\d{1,2}\s*(hrs|hr|h|horas)\b/.test(n);

  if (pareceHora) {
    let h;
    let m = null;
    if (hhmm) {
      h = parseInt(hhmm[1], 10);
      m = parseInt(hhmm[2], 10);
    } else if (/\bla una\b/.test(n)) {
      h = 1;
    } else {
      const num = n.match(/\b(\d{1,2})\b/);
      if (num) h = parseInt(num[1], 10);
      else {
        const palabra = n.split(' ').find((t) => NUMEROS[t] !== undefined && NUMEROS[t] <= 12);
        if (palabra) h = NUMEROS[palabra];
      }
    }
    if (h === undefined || Number.isNaN(h)) return null;
    if (pm && h < 12) h += 12;
    else if (!am && h >= 1 && h <= 7) h += 12; // "a las 4" en horario de oficina = 16:00

    const candidatos = horas
      .map((hora, i) => [hora, i])
      .filter(([hora]) => {
        const [hh, mm] = hora.split(':').map(Number);
        return hh === h && (m === null || mm === m);
      })
      .map(([, i]) => i);
    if (candidatos.length === 1) return { indice: candidatos[0], via: 'hora' };
    if (candidatos.length > 1) {
      const enPunto = candidatos.find((i) => horas[i].endsWith(':00'));
      return enPunto !== undefined ? { indice: enPunto, via: 'hora' } : { candidatos };
    }
    return { noDisponible: true, hora: `${String(h).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}` };
  }

  const numero = extraerNumeroOpcion(texto, horas.length);
  if (numero !== null) {
    if (numero >= 1 && numero <= horas.length) return { indice: numero - 1, via: 'numero' };
    // "16" o "10" fuera de rango de opciones: probablemente la hora
    if (numero >= 7 && numero <= 21) return interpretarHora(`a las ${numero}`, horas);
    return { fueraDeRango: numero };
  }
  if (/\b(temprano|primera hora)\b/.test(n)) return { indice: 0, via: 'hora' };
  return null;
}

// ---------- Confirmación ----------

const SI = /^(1|si+|sip|simon|claro|ok|okay|va|vale|dale|confirmo|confirmar|confirmada|confirmado|correcto|perfecto|de acuerdo|adelante|listo|por supuesto|asi es|esta bien)\b/;
const NO = /^(0|no|nop|nel|cancela|cancelar|cancelala|mejor no|negativo|ya no)\b/;

/** @returns {true|false|null} */
export function interpretarConfirmacion(texto) {
  const n = normalizar(texto);
  if (!n) return null;
  if (NO.test(n)) return false;
  if (SI.test(n)) return true;
  if (/\b(si|confirmo|claro|perfecto|de acuerdo)\b/.test(n) && !/\bno\b/.test(n)) return true;
  return null;
}
