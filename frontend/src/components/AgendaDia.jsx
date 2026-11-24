/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, addDays, addWeeks, isSameDay, startOfDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, RefreshCw, Plus, X, MessageCircle, HelpCircle, CalendarClock, Check, UserX,
  Utensils, Lock, AlertTriangle, LayoutDashboard, Globe, Loader2,
} from 'lucide-react';
import api from '../services/api';
import {
  filasDelDia, integrarHorasDeCitas, columnasDeAgenda, columnaDeCita, citasVisibles, conteoPorDia,
  yaPaso, enlaceWhatsApp, diaSemanaISO, fechaClave, aHora, aMinutos,
} from '../utils/agenda';

// Colores por estado de la cita (mismo significado que las etiquetas de la lista)
const COLORES_ESTADO = {
  PENDIENTE: {
    texto: 'Pendiente', bloque: 'bg-amber-50 ring-amber-300 text-amber-950 hover:bg-amber-100', punto: 'bg-amber-500',
    etiqueta: 'bg-amber-100 text-amber-900', ayuda: 'Agendada; falta confirmarla con el prospecto.',
  },
  CONFIRMADA: {
    texto: 'Confirmada', bloque: 'bg-green-50 ring-green-300 text-green-950 hover:bg-green-100', punto: 'bg-green-600',
    etiqueta: 'bg-green-100 text-green-800', ayuda: 'Confirmada; el prospecto recibe recordatorio por WhatsApp.',
  },
  COMPLETADA: {
    texto: 'Completada', bloque: 'bg-primary-50 ring-primary-200 text-primary-950 hover:bg-primary-100', punto: 'bg-primary-600',
    etiqueta: 'bg-primary-100 text-primary-800', ayuda: 'La visita se realizó.',
  },
  NO_ASISTIO: {
    texto: 'No asistió', bloque: 'bg-gray-100 ring-gray-300 text-gray-800 hover:bg-gray-200', punto: 'bg-gray-500',
    etiqueta: 'bg-gray-100 text-gray-800', ayuda: 'El prospecto no llegó a la visita.',
  },
  CANCELADA: {
    texto: 'Cancelada', bloque: 'bg-red-50 ring-red-200 text-red-900 hover:bg-red-100', punto: 'bg-red-500',
    etiqueta: 'bg-red-100 text-red-800', ayuda: 'Cancelada; solo se ve con «Mostrar canceladas».',
  },
};

const ORIGEN = {
  WHATSAPP: { texto: 'WhatsApp', Icono: MessageCircle, clase: 'text-green-700' },
  ADMIN: { texto: 'Panel', Icono: LayoutDashboard, clase: 'text-primary-700' },
  WEB: { texto: 'Web', Icono: Globe, clase: 'text-gray-600' },
};

const ACTIVAS = ['PENDIENTE', 'CONFIRMADA'];

const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const iso = (d) => format(d, 'yyyy-MM-dd');

function finDeCita(cita, duracion) {
  return aHora(aMinutos(cita.hora) + (cita.duracionMin || duracion));
}

function EtiquetaEstado({ estado }) {
  const e = COLORES_ESTADO[estado] || COLORES_ESTADO.PENDIENTE;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${e.etiqueta}`}>{e.texto}</span>;
}

function BloqueCita({ cita, duracion, seleccionada, onSelect, mostrarAsesor = false }) {
  const e = COLORES_ESTADO[cita.estado] || COLORES_ESTADO.PENDIENTE;
  const o = ORIGEN[cita.origen] || ORIGEN.WHATSAPP;
  const { Icono } = o;
  return (
    <button
      type="button"
      onClick={() => onSelect(cita)}
      aria-pressed={seleccionada}
      aria-label={`${e.texto}: ${cita.prospecto?.nombre || 'Prospecto'} a las ${cita.hora}`}
      className={`block w-full rounded-md px-2.5 py-1.5 text-left ring-1 transition-colors ${e.bloque} ${
        seleccionada ? 'ring-2 ring-primary-600' : ''
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums opacity-80">
        <span className={`h-2 w-2 shrink-0 rounded-full ${e.punto}`} aria-hidden="true" />
        {cita.hora}–{finDeCita(cita, duracion)}
        <Icono className={`ml-auto h-3.5 w-3.5 shrink-0 ${o.clase}`} aria-hidden="true" />
      </span>
      <span className={`mt-0.5 block truncate text-sm font-semibold ${cita.estado === 'CANCELADA' ? 'line-through' : ''}`}>
        {cita.prospecto?.nombre || 'Prospecto'}
      </span>
      <span className="block truncate text-xs opacity-80">
        {mostrarAsesor && cita.asesor?.nombre ? `${cita.asesor.nombre} · ` : ''}
        {cita.propiedad?.titulo || 'Sin propiedad'}
      </span>
    </button>
  );
}

function BotonLibre({ onAgendar, etiqueta, siempreVisible = false }) {
  return (
    <button
      type="button"
      onClick={onAgendar}
      aria-label={etiqueta}
      className="group flex min-h-[44px] w-full items-center justify-center rounded-md border border-dashed border-transparent text-sm text-gray-400 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus-visible:border-primary-300 focus-visible:bg-primary-50 focus-visible:text-primary-700"
    >
      {siempreVisible ? (
        <span className="inline-flex items-center gap-1 font-medium text-primary-700"><Plus className="h-4 w-4" aria-hidden="true" />Agendar</span>
      ) : (
        <>
          <span className="group-hover:hidden group-focus-visible:hidden">Libre</span>
          <span className="hidden items-center gap-1 font-medium group-hover:inline-flex group-focus-visible:inline-flex">
            <Plus className="h-4 w-4" aria-hidden="true" />Agendar
          </span>
        </>
      )}
    </button>
  );
}

function Leyenda() {
  const [abierta, setAbierta] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e) => ref.current && !ref.current.contains(e.target) && setAbierta(false);
    const esc = (e) => e.key === 'Escape' && setAbierta(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [abierta]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta} aria-controls="leyenda-colores"
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary-700 hover:bg-primary-50">
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        ¿Qué significan los colores?
      </button>
      {abierta && (
        <div id="leyenda-colores" role="dialog" aria-label="Significado de los colores"
          className="absolute right-0 z-30 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-white p-4 shadow-lg ring-1 ring-black/10">
          <ul className="space-y-2.5">
            {Object.entries(COLORES_ESTADO).map(([clave, e]) => (
              <li key={clave} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-0.5 h-4 w-6 shrink-0 rounded ring-1 ${e.bloque.split(' hover:')[0]}`} aria-hidden="true" />
                <span><span className="font-medium text-gray-900">{e.texto}.</span> <span className="text-gray-600">{e.ayuda}</span></span>
              </li>
            ))}
            <li className="flex items-start gap-2.5 border-t border-gray-100 pt-2.5 text-sm">
              <span className="mt-0.5 h-4 w-6 shrink-0 rounded border border-dashed border-gray-300" aria-hidden="true" />
              <span><span className="font-medium text-gray-900">Libre.</span> <span className="text-gray-600">Pasa el cursor y pulsa «Agendar».</span></span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 h-4 w-6 shrink-0 rounded bg-stripes-gray" aria-hidden="true" />
              <span><span className="font-medium text-gray-900">Comida o cerrado.</span> <span className="text-gray-600">Sale de Horarios y Cierres.</span></span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function DetalleCita({ cita, duracion, onEditar, onCancelar, cambiarEstado, accionEnCurso }) {
  if (!cita) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <CalendarClock className="h-9 w-9 text-gray-300" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-gray-900">Selecciona una cita en la agenda</p>
        <p className="mt-1 max-w-[16rem] text-sm text-gray-500">Aquí verás sus datos y podrás confirmarla, reprogramarla o cancelarla.</p>
      </div>
    );
  }
  const o = ORIGEN[cita.origen] || ORIGEN.WHATSAPP;
  const wa = enlaceWhatsApp(cita.prospecto?.telefono);
  const ocupado = (estado) => accionEnCurso === `${cita.id}:${estado}`;
  const bloqueado = Boolean(accionEnCurso);
  const fechaTexto = capitalizar(format(new Date(`${fechaClave(cita.fecha)}T12:00:00`), "EEEE d 'de' MMMM", { locale: es }));
  const btn = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold disabled:opacity-60';

  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <EtiquetaEstado estado={cita.estado} />
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${o.clase}`}>
            <o.Icono className="h-3.5 w-3.5" aria-hidden="true" />Creada desde {o.texto}
          </span>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{cita.prospecto?.nombre}</h3>
        <p className="text-sm tabular-nums text-gray-600">{fechaTexto} · {cita.hora}–{finDeCita(cita, duracion)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer"
            className={`${btn} bg-green-50 text-green-800 ring-1 ring-green-200 hover:bg-green-100`}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">{cita.prospecto.telefono}</span>
          </a>
        )}
        {cita.prospecto?.id && (
          <Link to={`/admin/prospectos/${cita.prospecto.id}`} className={`${btn} font-medium text-primary-700 hover:bg-primary-50`}>
            Ver prospecto
          </Link>
        )}
      </div>
      {cita.prospecto?.noContactar && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Este prospecto pidió no ser contactado por WhatsApp.
        </p>
      )}

      <dl className="grid grid-cols-[6rem,1fr] gap-x-3 gap-y-2.5 text-sm">
        <dt className="text-gray-500">Propiedad</dt>
        <dd className="min-w-0 text-gray-900">
          {cita.propiedad ? (
            <>
              <span className="break-words">{cita.propiedad.titulo}</span>
              {cita.propiedad.colonia && <span className="block text-xs text-gray-500">{cita.propiedad.colonia}</span>}
            </>
          ) : <span className="text-gray-500">Sin propiedad</span>}
        </dd>
        <dt className="text-gray-500">Asesor</dt>
        <dd className="text-gray-900">{cita.asesor?.nombre || <span className="text-gray-500">Sin asignar</span>}</dd>
        <dt className="text-gray-500">Origen</dt>
        <dd className="text-gray-900">{o.texto}</dd>
        <dt className="text-gray-500">Notas</dt>
        <dd className="whitespace-pre-line break-words text-gray-900">{cita.notas || <span className="text-gray-500">Sin notas</span>}</dd>
      </dl>

      {ACTIVAS.includes(cita.estado) ? (
        <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
          {cita.estado === 'PENDIENTE' && (
            <button type="button" disabled={bloqueado} onClick={() => cambiarEstado(cita, 'CONFIRMADA')}
              className={`${btn} col-span-2 bg-primary-600 text-white hover:bg-primary-700`}>
              {ocupado('CONFIRMADA') ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              Confirmar cita
            </button>
          )}
          {cita.estado === 'CONFIRMADA' && (
            <>
              <button type="button" disabled={bloqueado} onClick={() => cambiarEstado(cita, 'COMPLETADA')}
                className={`${btn} bg-primary-600 text-white hover:bg-primary-700`}>
                {ocupado('COMPLETADA') ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                Completar
              </button>
              <button type="button" disabled={bloqueado} onClick={() => cambiarEstado(cita, 'NO_ASISTIO')}
                className={`${btn} bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50`}>
                {ocupado('NO_ASISTIO') ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserX className="h-4 w-4" aria-hidden="true" />}
                No asistió
              </button>
            </>
          )}
          <button type="button" disabled={bloqueado} onClick={() => onEditar(cita)}
            className={`${btn} bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50`}>
            <CalendarClock className="h-4 w-4" aria-hidden="true" />Reprogramar
          </button>
          <button type="button" disabled={bloqueado} onClick={() => onCancelar(cita)}
            className={`${btn} bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50`}>
            <X className="h-4 w-4" aria-hidden="true" />Cancelar cita
          </button>
        </div>
      ) : (
        <p className="border-t border-gray-100 pt-4 text-sm text-gray-600">
          Esta cita ya está {COLORES_ESTADO[cita.estado]?.texto.toLowerCase()}; no tiene acciones pendientes.
        </p>
      )}
    </div>
  );
}

/**
 * Vista "Día": agenda por hora con una columna por asesor.
 */
export default function AgendaDia({ asesores, filtros, version, onNueva, onEditar, onCancelar, cambiarEstado, accionEnCurso }) {
  const [dia, setDia] = useState(() => startOfDay(new Date()));
  const [horarios, setHorarios] = useState(null);
  const [duracion, setDuracion] = useState(60);
  const [cierres, setCierres] = useState([]);
  const [citas, setCitas] = useState([]);
  const [listoClave, setListoClave] = useState(null);
  const [error, setError] = useState('');
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [seleccionId, setSeleccionId] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const hoy = startOfDay(new Date());

  const semanaInicio = useMemo(() => startOfWeek(dia, { weekStartsOn: 1 }), [dia]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i)), [semanaInicio]);
  const inicioISO = iso(dias[0]);
  const finISO = iso(dias[6]);

  useEffect(() => {
    let activo = true;
    Promise.all([api.get('/horarios'), api.get('/horarios/configuracion')])
      .then(([h, c]) => {
        if (!activo) return;
        setHorarios(h.data || []);
        setDuracion(c.data?.duracionCitaMin || 60);
      })
      .catch(() => activo && setHorarios([]));
    return () => { activo = false; };
  }, [version, recarga]);

  const clave = [inicioISO, finISO, filtros.origen, filtros.asesorId, version, recarga].join('|');
  const cargando = listoClave !== clave;

  useEffect(() => {
    let activo = true;
    const params = { fechaInicio: inicioISO, fechaFin: finISO };
    if (filtros.origen) params.origen = filtros.origen;
    if (filtros.asesorId) params.asesorId = filtros.asesorId;
    Promise.all([
      api.get('/citas', { params }),
      api.get('/horarios/cierres/list', { params: { fechaInicio: inicioISO, fechaFin: finISO } }).catch(() => ({ data: [] })),
    ])
      .then(([c, ci]) => {
        if (!activo) return;
        setCitas(c.data || []);
        setCierres(ci.data || []);
        setError('');
      })
      .catch(() => activo && setError('No se pudo cargar la agenda. Revisa tu conexión y pulsa «Actualizar».'))
      .finally(() => activo && setListoClave(clave));
    return () => { activo = false; };
  }, [clave, inicioISO, finISO, filtros.origen, filtros.asesorId]);

  const actualizar = useCallback(() => setRecarga((v) => v + 1), []);

  const estructura = useCallback((fecha) => {
    const clave = iso(fecha);
    const horario = (horarios || []).find((h) => h.diaSemana === diaSemanaISO(fecha));
    return filasDelDia({ horario, duracionMin: duracion, cierres: cierres.filter((c) => fechaClave(c.fecha) === clave) });
  }, [horarios, duracion, cierres]);

  const conteo = useMemo(() => conteoPorDia(citas), [citas]);
  const diaISO = iso(dia);
  const citasDelDia = useMemo(
    () => citasVisibles(citas.filter((c) => fechaClave(c.fecha) === diaISO), { incluirCanceladas: verCanceladas }),
    [citas, diaISO, verCanceladas],
  );
  const activasDelDia = citasDelDia.filter((c) => ACTIVAS.includes(c.estado)).length;

  const asesoresVisibles = filtros.asesorId ? asesores.filter((a) => a.id === filtros.asesorId) : asesores;
  const columnas = useMemo(() => columnasDeAgenda(asesoresVisibles, citasDelDia), [asesoresVisibles, citasDelDia]);
  const dato = horarios ? estructura(dia) : { cerrado: false, filas: [] };
  const filas = integrarHorasDeCitas(dato.filas, citasDelDia);

  const celda = (hora, colId) => citasDelDia.filter((c) => c.hora === hora && columnaDeCita(c, asesoresVisibles) === colId);
  const seleccion = citas.find((c) => c.id === seleccionId) || null;
  const pasado = isBefore(dia, hoy);
  const esHoy = isSameDay(dia, hoy);
  const fechaLarga = format(dia, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const puedeAgendar = (fila, colId) => !dato.cerrado && fila.tipo === 'slot' && !yaPaso(diaISO, fila.hora) && colId !== 'sin-asesor';

  // Escape cierra la hoja de detalle en pantallas chicas
  useEffect(() => {
    if (!seleccionId) return undefined;
    const esc = (e) => e.key === 'Escape' && setSeleccionId(null);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [seleccionId]);

  const rango = `${format(dias[0], 'd', { locale: es })}${dias[0].getMonth() !== dias[6].getMonth() ? format(dias[0], " 'de' MMMM", { locale: es }) : ''} – ${format(dias[6], "d 'de' MMMM 'de' yyyy", { locale: es })}`;
  const rangoCorto = `${format(dias[0], 'd MMM', { locale: es })} – ${format(dias[6], 'd MMM yyyy', { locale: es })}`.replace(/\./g, '');
  const detalleProps = { duracion, onEditar, onCancelar, cambiarEstado, accionEnCurso };

  return (
    <div className="mt-6">
      {/* Navegación de semana */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <button type="button" onClick={() => setDia(addWeeks(dia, -1))}
            className="tap-target rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Semana anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setDia(addWeeks(dia, 1))}
            className="tap-target rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Semana siguiente">
            <ChevronRight className="h-5 w-5" />
          </button>
          <h2 className="ml-1 truncate text-sm font-semibold text-gray-900 sm:text-base">
            <span className="hidden sm:inline">{rango}</span>
            <span className="sm:hidden">{rangoCorto}</span>
          </h2>
        </div>
        <button type="button" onClick={() => setDia(startOfDay(new Date()))}
          className="min-h-[40px] shrink-0 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Hoy
        </button>
      </div>

      {/* Tarjetas de la semana */}
      <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Días de la semana">
        <div className="grid min-w-[34rem] grid-cols-7 gap-2">
          {dias.map((d) => {
            const k = iso(d);
            const sel = k === diaISO;
            const cerrado = horarios ? estructura(d).cerrado : false;
            const n = conteo[k] || 0;
            const hoyEs = isSameDay(d, hoy);
            const resumen = n > 0 ? `${n} ${n === 1 ? 'cita' : 'citas'}` : cerrado ? 'Cerrado' : 'Sin citas';
            return (
              <button key={k} type="button" role="tab" aria-selected={sel} onClick={() => { setDia(d); setSeleccionId(null); }}
                aria-label={`${format(d, "EEEE d 'de' MMMM", { locale: es })}: ${resumen}`}
                className={`flex min-h-[72px] flex-col items-center justify-center rounded-xl px-1 py-2 text-center transition-colors ${
                  sel ? 'bg-primary-700 text-white shadow-sm'
                    : cerrado && n === 0 ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : `bg-white text-gray-900 ring-1 hover:bg-primary-50 ${hoyEs ? 'ring-primary-400' : 'ring-black/5'}`
                }`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${sel ? 'text-primary-100' : 'text-gray-500'}`}>
                  {format(d, 'EEE', { locale: es }).replace('.', '')}
                </span>
                <span className="text-xl font-semibold tabular-nums leading-tight">{format(d, 'd')}</span>
                <span className={`text-xs tabular-nums ${sel ? 'text-primary-100' : n > 0 ? 'font-medium text-primary-700' : ''}`}>{resumen}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-gray-600">Día seleccionado: <span className="font-medium text-gray-900">{fechaLarga}</span></p>
        <Leyenda />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="min-w-0 rounded-xl bg-white shadow-sm ring-1 ring-black/5" aria-labelledby="agenda-titulo">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="agenda-titulo" className="text-lg font-semibold text-gray-900">
                  Agenda del {format(dia, "EEEE d 'de' MMMM", { locale: es })}
                </h2>
                {esHoy && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800">Hoy</span>}
              </div>
              <p className="mt-0.5 text-sm text-gray-600">
                {asesoresVisibles.length} {asesoresVisibles.length === 1 ? 'asesor' : 'asesores'} · citas de {duracion} min
                {!dato.cerrado && ` · ${activasDelDia} ${activasDelDia === 1 ? 'activa' : 'activas'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="checkbox-field" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} />
                Mostrar canceladas
              </label>
              <button type="button" onClick={actualizar} disabled={cargando}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
                Actualizar
              </button>
            </div>
          </header>

          {error && (
            <p className="mx-4 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-5" role="alert">{error}</p>
          )}

          {!horarios ? (
            <div className="flex h-48 items-center justify-center" role="status" aria-label="Cargando agenda">
              <Loader2 className="h-7 w-7 animate-spin text-primary-600" aria-hidden="true" />
            </div>
          ) : dato.cerrado && citasDelDia.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Lock className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-gray-900">Cerrado</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
                {dato.motivo}. No se agendan citas este día; cámbialo en{' '}
                <Link to="/admin/horarios" className="font-medium text-primary-700 underline underline-offset-2">Horarios</Link>.
              </p>
            </div>
          ) : (
            <>
              {dato.cerrado && (
                <p className="mx-4 mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:mx-5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Este día está cerrado ({dato.motivo}), pero tiene citas agendadas. Revísalas.
                </p>
              )}
              {activasDelDia === 0 && !dato.cerrado && (
                <p className="mx-4 mt-4 rounded-lg bg-primary-50 px-3 py-2.5 text-sm text-primary-900 sm:mx-5">
                  {pasado
                    ? 'No hubo citas pendientes ni confirmadas este día.'
                    : 'No hay citas pendientes ni confirmadas este día. Pulsa «Agendar» en cualquier horario libre para crear una.'}
                </p>
              )}

              {/* Escritorio y tableta: tabla hora × asesor */}
              <div className="hidden overflow-x-auto p-2 sm:block sm:p-3">
                <table className="w-full table-fixed border-separate border-spacing-0 text-sm" style={{ minWidth: `${5.5 + columnas.length * 11}rem` }}>
                  <thead>
                    <tr>
                      <th scope="col" className="w-[5.5rem] px-3 pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Hora</th>
                      {columnas.map((col) => (
                        <th key={col.id} scope="col" className="px-1.5 pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <span className="block truncate">{col.nombre}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => {
                      if (fila.tipo === 'pausa' || fila.tipo === 'cierre') {
                        return (
                          <tr key={`${fila.tipo}-${fila.hora}`}>
                            <th scope="row" className="border-t border-gray-100 px-3 py-2 text-left align-middle text-sm font-medium tabular-nums text-gray-400">{fila.hora}</th>
                            <td colSpan={columnas.length} className="border-t border-gray-100 p-1.5">
                              <div className="bg-stripes-gray flex min-h-[40px] items-center gap-2 rounded-md px-3 text-sm text-gray-600">
                                {fila.tipo === 'pausa'
                                  ? <><Utensils className="h-4 w-4" aria-hidden="true" />Comida · <span className="tabular-nums">{fila.hora}–{fila.fin}</span></>
                                  : <><Lock className="h-4 w-4" aria-hidden="true" />Cerrado · {fila.motivo}</>}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      const paso = yaPaso(diaISO, fila.hora);
                      return (
                        <tr key={`${fila.tipo}-${fila.hora}`}>
                          <th scope="row" className={`border-t border-gray-100 px-3 py-2 text-left align-top text-sm font-semibold tabular-nums ${paso ? 'text-gray-400' : 'text-gray-900'}`}>
                            {fila.hora}
                          </th>
                          {columnas.map((col) => {
                            const lista = celda(fila.hora, col.id);
                            return (
                              <td key={col.id} className="border-t border-gray-100 p-1.5 align-top">
                                {lista.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {lista.map((c) => (
                                      <BloqueCita key={c.id} cita={c} duracion={duracion} seleccionada={c.id === seleccionId} onSelect={(x) => setSeleccionId(x.id)} />
                                    ))}
                                  </div>
                                ) : puedeAgendar(fila, col.id) ? (
                                  <BotonLibre
                                    etiqueta={`Agendar a las ${fila.hora} con ${col.nombre}`}
                                    onAgendar={() => onNueva({ fecha: diaISO, hora: fila.hora, asesorId: col.id })} />
                                ) : (
                                  <span className="flex min-h-[44px] items-center justify-center text-sm text-gray-300" aria-label="Sin cita">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Móvil: lista por hora */}
              <ol className="divide-y divide-gray-100 sm:hidden">
                {filas.map((fila) => {
                  if (fila.tipo === 'pausa' || fila.tipo === 'cierre') {
                    return (
                      <li key={`m-${fila.tipo}-${fila.hora}`} className="flex items-center gap-3 px-4 py-2">
                        <span className="w-12 shrink-0 text-sm font-medium tabular-nums text-gray-400">{fila.hora}</span>
                        <span className="bg-stripes-gray flex min-h-[36px] flex-1 items-center gap-2 rounded-md px-3 text-sm text-gray-600">
                          {fila.tipo === 'pausa' ? <><Utensils className="h-4 w-4" aria-hidden="true" />Comida</> : <><Lock className="h-4 w-4" aria-hidden="true" />{fila.motivo}</>}
                        </span>
                      </li>
                    );
                  }
                  const lista = citasDelDia.filter((c) => c.hora === fila.hora);
                  const libres = columnas.filter((col) => col.id !== 'sin-asesor' && celda(fila.hora, col.id).length === 0);
                  const agendable = libres.length > 0 && puedeAgendar(fila, libres[0].id);
                  const paso = yaPaso(diaISO, fila.hora);
                  return (
                    <li key={`m-${fila.tipo}-${fila.hora}`} className="flex gap-3 px-4 py-2">
                      <span className={`w-12 shrink-0 pt-2.5 text-sm font-semibold tabular-nums ${paso ? 'text-gray-400' : 'text-gray-900'}`}>{fila.hora}</span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {lista.map((c) => (
                          <BloqueCita key={c.id} cita={c} duracion={duracion} seleccionada={c.id === seleccionId}
                            mostrarAsesor={columnas.length > 1} onSelect={(x) => setSeleccionId(x.id)} />
                        ))}
                        {agendable ? (
                          <BotonLibre siempreVisible
                            etiqueta={`Agendar a las ${fila.hora}`}
                            onAgendar={() => onNueva({ fecha: diaISO, hora: fila.hora, asesorId: libres.length === 1 ? libres[0].id : '' })} />
                        ) : lista.length === 0 && (
                          <span className="flex min-h-[44px] items-center text-sm text-gray-400">{paso ? 'Sin cita' : 'Sin lugar'}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>

        {/* Panel de detalle: lateral en pantallas grandes */}
        <aside className="hidden xl:block" aria-label="Detalle de la cita">
          <div className="sticky top-4 rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <h2 className="border-b border-gray-100 px-5 py-3.5 text-base font-semibold text-gray-900">Detalle de la cita</h2>
            <DetalleCita cita={seleccion} {...detalleProps} />
          </div>
        </aside>
      </div>

      {/* Hoja inferior en pantallas chicas y medianas */}
      {seleccion && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-gray-900/40 xl:hidden" onMouseDown={(e) => e.target === e.currentTarget && setSeleccionId(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="detalle-hoja-titulo"
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white pb-safe shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-2">
              <h2 id="detalle-hoja-titulo" className="text-base font-semibold text-gray-900">Detalle de la cita</h2>
              <button type="button" onClick={() => setSeleccionId(null)} className="tap-target -mr-3 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar detalle">
                <X className="h-5 w-5" />
              </button>
            </div>
            <DetalleCita cita={seleccion} {...detalleProps} />
          </div>
        </div>
      )}
    </div>
  );
}
