/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfWeek, addDays, addWeeks, isSameDay, parseISO, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar, List, Plus, ChevronLeft, ChevronRight, MessageCircle, LayoutDashboard, Globe, Pencil, Loader2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import CitaFormModal from '../../components/CitaFormModal';

const ESTADOS = {
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-amber-100 text-amber-900', punto: 'bg-amber-500' },
  CONFIRMADA: { texto: 'Confirmada', clase: 'bg-green-100 text-green-800', punto: 'bg-green-600' },
  COMPLETADA: { texto: 'Completada', clase: 'bg-primary-100 text-primary-800', punto: 'bg-primary-600' },
  CANCELADA: { texto: 'Cancelada', clase: 'bg-red-100 text-red-800', punto: 'bg-red-500' },
  NO_ASISTIO: { texto: 'No asistió', clase: 'bg-gray-100 text-gray-800', punto: 'bg-gray-500' },
};

const ORIGENES = {
  WHATSAPP: { texto: 'WhatsApp', Icono: MessageCircle, clase: 'text-green-700' },
  ADMIN: { texto: 'Admin', Icono: LayoutDashboard, clase: 'text-primary-700' },
  WEB: { texto: 'Web', Icono: Globe, clase: 'text-gray-700' },
};

const ACTIVAS = ['PENDIENTE', 'CONFIRMADA'];

function EstadoBadge({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.PENDIENTE;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${e.clase}`}>{e.texto}</span>
  );
}

function OrigenBadge({ origen }) {
  const o = ORIGENES[origen] || ORIGENES.WHATSAPP;
  const { Icono } = o;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${o.clase}`} title={`Creada desde ${o.texto}`}>
      <Icono className="h-3.5 w-3.5" aria-hidden="true" />
      {o.texto}
    </span>
  );
}

function fechaDeCita(cita) {
  return parseISO(cita.fecha);
}

export default function CitasPage() {
  const [vista, setVista] = useState('list');
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ estado: '', origen: '', asesorId: '' });
  const [asesores, setAsesores] = useState([]);
  const [semanaInicio, setSemanaInicio] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modal, setModal] = useState({ abierto: false, cita: null, fecha: null });
  const [cancelando, setCancelando] = useState(null);
  const [accionEnCurso, setAccionEnCurso] = useState(null);

  const [version, setVersion] = useState(0);
  const cargarCitas = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let activo = true;
    const params = {};
    if (filtros.estado) params.estado = filtros.estado;
    if (filtros.origen) params.origen = filtros.origen;
    if (filtros.asesorId) params.asesorId = filtros.asesorId;
    api.get('/citas', { params })
      .then(({ data }) => activo && setCitas(data))
      .catch((error) => {
        console.error('Error cargando citas:', error);
        if (activo) toast.error('No se pudieron cargar las citas');
      })
      .finally(() => activo && setLoading(false));
    return () => {
      activo = false;
    };
  }, [filtros, version]);

  useEffect(() => {
    api.get('/citas/asesores').then(({ data }) => setAsesores(data || [])).catch(() => setAsesores([]));
  }, []);

  const abrirNueva = (fecha = null) => setModal({ abierto: true, cita: null, fecha });
  const abrirEditar = (cita) => setModal({ abierto: true, cita, fecha: null });
  const cerrarModal = useCallback(() => setModal({ abierto: false, cita: null, fecha: null }), []);

  const cambiarEstado = async (cita, estado) => {
    setAccionEnCurso(`${cita.id}:${estado}`);
    try {
      await api.patch(`/citas/${cita.id}`, { estado });
      toast.success(`Cita marcada como ${ESTADOS[estado].texto.toLowerCase()}`);
      cargarCitas();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar la cita');
    } finally {
      setAccionEnCurso(null);
    }
  };

  const hayFiltros = filtros.estado || filtros.origen || filtros.asesorId;

  const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i)), [semanaInicio]);
  const citasPorDia = useMemo(
    () => diasSemana.map((dia) => citas.filter((c) => isSameDay(fechaDeCita(c), dia))),
    [citas, diasSemana],
  );
  const hoy = startOfDay(new Date());

  const Acciones = ({ cita, compacto = false }) => {
    if (!ACTIVAS.includes(cita.estado)) return null;
    const base = compacto
      ? 'min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium'
      : 'rounded-md px-2 py-1 text-sm font-medium';
    const ocupado = (estado) => accionEnCurso === `${cita.id}:${estado}`;
    return (
      <>
        {cita.estado === 'PENDIENTE' && (
          <button type="button" onClick={() => cambiarEstado(cita, 'CONFIRMADA')} disabled={Boolean(accionEnCurso)}
            className={`${base} ${compacto ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-green-50'} text-green-800`}>
            {ocupado('CONFIRMADA') ? 'Confirmando…' : 'Confirmar'}
          </button>
        )}
        {cita.estado === 'CONFIRMADA' && (
          <>
            <button type="button" onClick={() => cambiarEstado(cita, 'COMPLETADA')} disabled={Boolean(accionEnCurso)}
              className={`${base} ${compacto ? 'bg-primary-50 hover:bg-primary-100' : 'hover:bg-primary-50'} text-primary-700`}>
              {ocupado('COMPLETADA') ? 'Guardando…' : 'Completar'}
            </button>
            <button type="button" onClick={() => cambiarEstado(cita, 'NO_ASISTIO')} disabled={Boolean(accionEnCurso)}
              className={`${base} ${compacto ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-100'} text-gray-700`}>
              No asistió
            </button>
          </>
        )}
        <button type="button" onClick={() => abrirEditar(cita)}
          className={`${base} ${compacto ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-100'} inline-flex items-center justify-center gap-1 text-gray-700`}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
        </button>
        <button type="button" onClick={() => setCancelando(cita)}
          className={`${base} ${compacto ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-red-50'} text-red-700`}>
          Cancelar
        </button>
      </>
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Citas</h1>
          <p className="mt-1 text-sm text-gray-600">Gestiona las citas y visitas de tus prospectos</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5" role="tablist" aria-label="Vista">
            {[
              ['list', 'Lista', List],
              ['week', 'Semana', Calendar],
            ].map(([valor, texto, Icono]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={vista === valor}
                onClick={() => setVista(valor)}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-3 text-sm font-medium ${
                  vista === valor ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icono className="h-4 w-4" aria-hidden="true" />
                {texto}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => abrirNueva()}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 sm:flex-none"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva cita
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          className="input-field sm:w-48" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([valor, { texto }]) => (
            <option key={valor} value={valor}>{texto}</option>
          ))}
        </select>
        <select value={filtros.origen} onChange={(e) => setFiltros({ ...filtros, origen: e.target.value })}
          className="input-field sm:w-48" aria-label="Filtrar por origen">
          <option value="">Todos los orígenes</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="ADMIN">Admin</option>
        </select>
        {asesores.length > 1 && (
          <select value={filtros.asesorId} onChange={(e) => setFiltros({ ...filtros, asesorId: e.target.value })}
            className="input-field sm:w-56" aria-label="Filtrar por asesor">
            <option value="">Todos los asesores</option>
            {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center" role="status" aria-label="Cargando citas">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        </div>
      ) : vista === 'list' ? (
        <div className="mt-6">
          {citas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-gray-400" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-gray-900">
                {hayFiltros ? 'Ninguna cita coincide con los filtros' : 'No hay citas'}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
                {hayFiltros
                  ? 'Cambia los filtros para ver más citas.'
                  : 'Agenda una desde aquí o deja que tus prospectos la pidan por WhatsApp escribiendo “agendar”.'}
              </p>
              {!hayFiltros && (
                <button type="button" onClick={() => abrirNueva()}
                  className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Nueva cita
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Móvil: tarjetas */}
              <ul className="space-y-3 lg:hidden">
                {citas.map((cita) => (
                  <li key={cita.id} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold capitalize text-gray-900 tabular-nums">
                          {format(fechaDeCita(cita), "EEE d MMM", { locale: es })} · {cita.hora}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-gray-900">{cita.prospecto.nombre}</p>
                        <p className="text-xs text-gray-500 tabular-nums">{cita.prospecto.telefono}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <EstadoBadge estado={cita.estado} />
                        <OrigenBadge origen={cita.origen} />
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="text-gray-500">Propiedad</dt>
                      <dd className="min-w-0 break-words text-gray-900">
                        {cita.propiedad ? cita.propiedad.titulo : <span className="italic text-gray-400">Sin propiedad</span>}
                      </dd>
                      <dt className="text-gray-500">Asesor</dt>
                      <dd className="text-gray-900">{cita.asesor?.nombre || '—'}</dd>
                      {cita.notas && (
                        <>
                          <dt className="text-gray-500">Notas</dt>
                          <dd className="text-gray-700">{cita.notas}</dd>
                        </>
                      )}
                    </dl>
                    {ACTIVAS.includes(cita.estado) && (
                      <div className={`mt-3 grid gap-2 border-t border-gray-100 pt-3 ${cita.estado === 'CONFIRMADA' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        <Acciones cita={cita} compacto />
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Escritorio: tabla */}
              <div className="hidden overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-black/5 lg:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Fecha y hora', 'Prospecto', 'Propiedad', 'Asesor', 'Estado'].map((t) => (
                        <th key={t} scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900 first:pl-6">{t}</th>
                      ))}
                      <th scope="col" className="py-3 pl-3 pr-6"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {citas.map((cita) => (
                      <tr key={cita.id} className="align-top hover:bg-gray-50/60">
                        <td className="whitespace-nowrap py-3.5 pl-6 pr-3 text-sm tabular-nums">
                          <span className="font-medium capitalize text-gray-900">{format(fechaDeCita(cita), "EEE d MMM yyyy", { locale: es })}</span>
                          <span className="block text-gray-500">{cita.hora}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm">
                          <span className="text-gray-900">{cita.prospecto.nombre}</span>
                          <span className="block text-xs tabular-nums text-gray-500">{cita.prospecto.telefono}</span>
                        </td>
                        <td className="min-w-[11rem] max-w-[15rem] px-3 py-3.5 text-sm text-gray-900">
                          {cita.propiedad ? (
                            <>
                              {cita.propiedad.titulo}
                              {cita.propiedad.colonia && <span className="block text-xs text-gray-500">{cita.propiedad.colonia}</span>}
                            </>
                          ) : (
                            <span className="italic text-gray-400">Sin propiedad</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-700">{cita.asesor?.nombre || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-sm">
                          <EstadoBadge estado={cita.estado} />
                          <span className="mt-1 block"><OrigenBadge origen={cita.origen} /></span>
                        </td>
                        <td className="whitespace-nowrap py-2.5 pl-3 pr-4 text-right">
                          <div className="flex justify-end gap-0.5">
                            <Acciones cita={cita} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setSemanaInicio(addWeeks(semanaInicio, -1))}
                className="tap-target rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Semana anterior">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setSemanaInicio(addWeeks(semanaInicio, 1))}
                className="tap-target rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Semana siguiente">
                <ChevronRight className="h-5 w-5" />
              </button>
              <h2 className="ml-1 text-sm font-semibold text-gray-900 sm:text-base">
                {format(diasSemana[0], 'd MMM', { locale: es })} – {format(diasSemana[6], "d MMM yyyy", { locale: es })}
              </h2>
            </div>
            <button type="button" onClick={() => setSemanaInicio(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="min-h-[40px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Hoy
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-7 lg:gap-2">
            {diasSemana.map((dia, i) => {
              const pasado = isBefore(dia, hoy);
              const esHoy = isSameDay(dia, hoy);
              return (
                <section key={dia.toISOString()} aria-label={format(dia, "EEEE d 'de' MMMM", { locale: es })}
                  className={`flex flex-col rounded-lg bg-white ring-1 lg:min-h-[14rem] ${esHoy ? 'ring-primary-300' : 'ring-black/5'}`}>
                  <header className="flex min-h-[41px] items-center justify-between border-b border-gray-100 px-3 py-1.5">
                    <p className={`text-sm font-semibold capitalize ${esHoy ? 'text-primary-700' : 'text-gray-900'}`}>
                      {format(dia, 'EEE d', { locale: es })}
                    </p>
                    {!pasado && (
                      <button type="button" onClick={() => abrirNueva(format(dia, 'yyyy-MM-dd'))}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-700"
                        aria-label={`Nueva cita el ${format(dia, "EEEE d 'de' MMMM", { locale: es })}`}>
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </header>
                  <ul className="flex-1 space-y-1.5 p-2">
                    {citasPorDia[i].length === 0 ? (
                      <li className="px-1 py-1 text-xs text-gray-400">Sin citas</li>
                    ) : (
                      citasPorDia[i].map((cita) => {
                        const e = ESTADOS[cita.estado] || ESTADOS.PENDIENTE;
                        const o = ORIGENES[cita.origen] || ORIGENES.WHATSAPP;
                        const { Icono } = o;
                        return (
                          <li key={cita.id}>
                            <button type="button" onClick={() => ACTIVAS.includes(cita.estado) && abrirEditar(cita)}
                              className={`w-full rounded-md border border-gray-200 px-2 py-1.5 text-left hover:border-primary-300 hover:bg-primary-50/50 ${
                                ACTIVAS.includes(cita.estado) ? '' : 'cursor-default opacity-60'
                              }`}
                              title={`${e.texto} · ${o.texto}`}>
                              <span className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-gray-900">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${e.punto}`} aria-hidden="true" />
                                {cita.hora}
                                <Icono className={`ml-auto h-3.5 w-3.5 ${o.clase}`} aria-label={o.texto} />
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-gray-700">{cita.prospecto.nombre}</span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {modal.abierto && (
      <CitaFormModal
        key={modal.cita?.id || `nueva-${modal.fecha || 'hoy'}`}
        isOpen={modal.abierto}
        cita={modal.cita}
        fechaInicial={modal.fecha}
        onClose={cerrarModal}
        onSaved={() => cargarCitas()}
      />
      )}

      {cancelando && (
        <CancelarCitaDialog
          cita={cancelando}
          onClose={() => setCancelando(null)}
          onDone={async () => {
            setCancelando(null);
            cargarCitas();
          }}
        />
      )}
    </div>
  );
}

function CancelarCitaDialog({ cita, onClose, onDone }) {
  const [motivo, setMotivo] = useState('');
  const [notificar, setNotificar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !guardando && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, guardando]);

  const confirmar = async () => {
    setGuardando(true);
    try {
      const { data } = await api.patch(`/citas/${cita.id}`, {
        estado: 'CANCELADA',
        motivoCancelacion: motivo.trim() || undefined,
        notificarCliente: notificar,
      });
      toast.success('Cita cancelada');
      if (notificar && !data?.whatsapp?.enviado && data?.whatsapp?.motivo) {
        toast.error(`WhatsApp no enviado: ${data.whatsapp.motivo}`);
      }
      await onDone();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cancelar la cita');
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !guardando && onClose()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="cancelar-cita-title"
        className="w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 sm:px-6 sm:py-3">
          <h2 id="cancelar-cita-title" className="text-lg font-semibold text-gray-900">Cancelar cita</h2>
          <button type="button" onClick={onClose} disabled={guardando}
            className="tap-target -mr-3 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">{cita.prospecto.nombre}</span>
            {' · '}
            <span>{(() => { const t = format(parseISO(cita.fecha), "EEEE d 'de' MMMM", { locale: es }); return t.charAt(0).toUpperCase() + t.slice(1); })()}</span>
            {' a las '}<span className="tabular-nums">{cita.hora}</span>
          </p>
          <div>
            <label htmlFor="motivo-cancelacion" className="mb-1.5 block text-sm font-medium text-gray-700">
              Motivo <span className="font-normal text-gray-500">(opcional)</span>
            </label>
            <input id="motivo-cancelacion" type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="input-field" placeholder="Ej. El cliente pidió cambiar de día" autoFocus />
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={notificar} onChange={(e) => setNotificar(e.target.checked)} className="checkbox-field mt-0.5" />
            <span className="text-sm text-gray-800">Avisar al prospecto por WhatsApp</span>
          </label>
        </div>
        <div className="flex gap-3 border-t border-gray-200 px-4 py-3 pb-safe sm:px-6">
          <button type="button" onClick={onClose} disabled={guardando}
            className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Volver
          </button>
          <button type="button" onClick={confirmar} disabled={guardando}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Cancelar cita
          </button>
        </div>
      </div>
    </div>
  );
}
