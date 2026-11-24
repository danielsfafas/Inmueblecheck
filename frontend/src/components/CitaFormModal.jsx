/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Search, UserPlus, Loader2, CalendarPlus, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const hoyISO = () => format(new Date(), 'yyyy-MM-dd');

function soloDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

/**
 * Crear (cita = null) o editar/reprogramar una cita.
 * Las horas salen de GET /horarios/slots (Horarios, Cierres y duración configurada).
 */
export default function CitaFormModal({ isOpen, onClose, onSaved, cita = null, fechaInicial = null }) {
  const editando = Boolean(cita);
  const [prospectos, setProspectos] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [asesores, setAsesores] = useState([]);

  const [modoProspecto, setModoProspecto] = useState('existente');
  const [busqueda, setBusqueda] = useState('');
  const [prospectoId, setProspectoId] = useState(cita?.prospecto?.id || '');
  const [nuevo, setNuevo] = useState({ nombre: '', telefono: '' });
  const [propiedadId, setPropiedadId] = useState(cita?.propiedad?.id || '');
  const [fecha, setFecha] = useState(cita ? format(parseISO(cita.fecha), 'yyyy-MM-dd') : fechaInicial || hoyISO());
  const [horaElegida, setHora] = useState(cita?.hora || '');
  const [asesorId, setAsesorId] = useState(cita?.asesor?.id || '');
  const [notas, setNotas] = useState(cita?.notas || '');
  const [notificarCliente, setNotificarCliente] = useState(false);

  const [slots, setSlots] = useState([]);
  const [slotsMotivo, setSlotsMotivo] = useState('');
  const [cargandoSlots, setCargandoSlots] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const primerCampoRef = useRef(null);

  // Cargar catálogos y estado inicial al abrir
  useEffect(() => {
    if (!isOpen) return undefined;
    let activo = true;
    (async () => {
      try {
        const [pros, props, ases] = await Promise.all([
          editando ? Promise.resolve({ data: [] }) : api.get('/prospectos'),
          api.get('/propiedades'),
          api.get('/citas/asesores'),
        ]);
        if (!activo) return;
        setProspectos(pros.data || []);
        setPropiedades((props.data || []).filter((p) => p.estadoPropiedad !== 'VENDIDA' && p.estadoPropiedad !== 'RENTADA' || p.id === cita?.propiedadId));
        setAsesores(ases.data || []);
      } catch (err) {
        console.error('Error cargando catálogos de citas:', err);
      }
    })();

    const t = setTimeout(() => primerCampoRef.current?.focus(), 50);
    return () => {
      activo = false;
      clearTimeout(t);
    };
  }, [isOpen, cita, editando]);

  // Escape cierra y bloquea el scroll del fondo
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && !guardando && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, onClose, guardando]);

  // Horarios disponibles según fecha y propiedad
  useEffect(() => {
    if (!isOpen || !fecha) return undefined;
    let activo = true;
    (async () => {
      setCargandoSlots(true);
      try {
        const { data } = await api.get('/horarios/slots', { params: { fecha, propiedadId: propiedadId || undefined } });
        if (!activo) return;
        setSlots(data.slots || []);
        setSlotsMotivo(data.motivo || '');
      } catch (err) {
        if (!activo) return;
        setSlots([]);
        setSlotsMotivo(err.response?.data?.error || 'No se pudieron cargar los horarios');
      } finally {
        if (activo) setCargandoSlots(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [isOpen, fecha, propiedadId]);

  const horasMostradas = useMemo(() => {
    const libres = slots.filter((s) => s.disponible).map((s) => s.hora);
    // Al editar, la hora actual de la cita sigue siendo válida aunque cuente como ocupada
    if (editando && cita && fecha === format(parseISO(cita.fecha), 'yyyy-MM-dd') && !libres.includes(cita.hora)) {
      libres.push(cita.hora);
      libres.sort();
    }
    return libres;
  }, [slots, editando, cita, fecha]);

  // Si la hora elegida deja de existir al cambiar fecha/propiedad, ya no cuenta
  const hora = !cargandoSlots && horasMostradas.includes(horaElegida) ? horaElegida : '';

  const prospectosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const qDig = soloDigitos(q);
    const lista = !q
      ? prospectos
      : prospectos.filter((p) =>
          p.nombre?.toLowerCase().includes(q) || (qDig.length >= 3 && soloDigitos(p.telefono).includes(qDig)));
    return lista.slice(0, 6);
  }, [busqueda, prospectos]);

  const prospectoSeleccionado = editando
    ? cita?.prospecto
    : prospectos.find((p) => p.id === prospectoId);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!editando && modoProspecto === 'existente' && !prospectoId) {
      setError('Elige un prospecto de la lista o crea uno nuevo.');
      return;
    }
    if (!editando && modoProspecto === 'nuevo' && (!nuevo.nombre.trim() || soloDigitos(nuevo.telefono).length < 10)) {
      setError('Escribe el nombre y un teléfono de 10 dígitos.');
      return;
    }
    if (!hora) {
      setError('Elige un horario disponible.');
      return;
    }

    setGuardando(true);
    try {
      let data;
      if (editando) {
        ({ data } = await api.patch(`/citas/${cita.id}`, {
          fecha,
          hora,
          propiedadId: propiedadId || null,
          asesorId: asesorId || null,
          notas,
          notificarCliente,
        }));
        toast.success('Cita actualizada');
      } else {
        ({ data } = await api.post('/citas', {
          ...(modoProspecto === 'existente'
            ? { prospectoId }
            : { prospectoNuevo: { nombre: nuevo.nombre.trim(), telefono: nuevo.telefono } }),
          propiedadId: propiedadId || null,
          asesorId: asesorId || null,
          fecha,
          hora,
          notas,
          notificarCliente,
        }));
        toast.success('Cita agendada');
      }
      if (notificarCliente) {
        if (data?.whatsapp?.enviado) toast.success('Confirmación enviada por WhatsApp');
        else if (data?.whatsapp?.motivo) toast.error(`WhatsApp no enviado: ${data.whatsapp.motivo}`);
      }
      onSaved?.(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la cita. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const fechaTexto = fecha ? format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es }) : '';
  const fechaLegible = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !guardando && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cita-form-title"
        className="flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2">
            {editando ? (
              <CalendarClock className="h-5 w-5 text-primary-600" aria-hidden="true" />
            ) : (
              <CalendarPlus className="h-5 w-5 text-primary-600" aria-hidden="true" />
            )}
            <h2 id="cita-form-title" className="text-lg font-semibold text-gray-900">
              {editando ? 'Editar cita' : 'Nueva cita'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="tap-target -mr-3 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {/* Prospecto */}
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-gray-700">Prospecto</legend>
              {editando ? (
                <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                  {prospectoSeleccionado?.nombre}
                  <span className="ml-2 tabular-nums text-gray-500">{prospectoSeleccionado?.telefono}</span>
                </p>
              ) : (
                <>
                  <div className="mb-2 inline-flex rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Tipo de prospecto">
                    {[
                      ['existente', 'Buscar existente'],
                      ['nuevo', 'Crear nuevo'],
                    ].map(([valor, texto]) => (
                      <button
                        key={valor}
                        type="button"
                        role="tab"
                        aria-selected={modoProspecto === valor}
                        onClick={() => setModoProspecto(valor)}
                        className={`min-h-[36px] rounded-md px-3 text-sm font-medium transition-colors ${
                          modoProspecto === valor ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {texto}
                      </button>
                    ))}
                  </div>

                  {modoProspecto === 'existente' ? (
                    prospectoSeleccionado ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{prospectoSeleccionado.nombre}</p>
                          <p className="text-xs tabular-nums text-gray-600">{prospectoSeleccionado.telefono}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProspectoId('');
                            setTimeout(() => primerCampoRef.current?.focus(), 0);
                          }}
                          className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-primary-700 hover:bg-primary-100"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                          <input
                            ref={primerCampoRef}
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Nombre o teléfono"
                            className="input-field pl-9"
                            aria-label="Buscar prospecto por nombre o teléfono"
                          />
                        </div>
                        <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200" role="listbox" aria-label="Prospectos">
                          {prospectosFiltrados.length === 0 ? (
                            <li className="px-3 py-3 text-sm text-gray-500">
                              Sin resultados.{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setModoProspecto('nuevo');
                                  setNuevo((n) => ({
                                    ...n,
                                    ...(soloDigitos(busqueda).length >= 10 ? { telefono: busqueda } : { nombre: busqueda }),
                                  }));
                                }}
                                className="font-medium text-primary-700 hover:underline"
                              >
                                Crear prospecto
                              </button>
                            </li>
                          ) : (
                            prospectosFiltrados.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={false}
                                  onClick={() => setProspectoId(p.id)}
                                  className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:bg-gray-50"
                                >
                                  <span className="truncate text-gray-900">{p.nombre}</span>
                                  <span className="shrink-0 tabular-nums text-gray-500">{p.telefono}</span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="cita-nuevo-nombre" className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
                        <input
                          id="cita-nuevo-nombre"
                          type="text"
                          autoComplete="off"
                          value={nuevo.nombre}
                          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                          className="input-field"
                          placeholder="Nombre del cliente"
                        />
                      </div>
                      <div>
                        <label htmlFor="cita-nuevo-telefono" className="mb-1 block text-xs font-medium text-gray-600">Teléfono</label>
                        <input
                          id="cita-nuevo-telefono"
                          type="tel"
                          inputMode="tel"
                          autoComplete="off"
                          value={nuevo.telefono}
                          onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                          className="input-field tabular-nums"
                          placeholder="10 dígitos"
                        />
                      </div>
                      <p className="text-xs text-gray-500 sm:col-span-2">
                        <UserPlus className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
                        Si el teléfono ya existe, se usa ese prospecto.
                      </p>
                    </div>
                  )}
                </>
              )}
            </fieldset>

            {/* Propiedad */}
            <div>
              <label htmlFor="cita-propiedad" className="mb-1.5 block text-sm font-medium text-gray-700">
                Propiedad <span className="font-normal text-gray-500">(opcional)</span>
              </label>
              <select id="cita-propiedad" value={propiedadId} onChange={(e) => setPropiedadId(e.target.value)} className="input-field">
                <option value="">Sin propiedad específica</option>
                {propiedades.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}{p.colonia ? ` · ${p.colonia}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha y hora */}
            <div>
              <label htmlFor="cita-fecha" className="mb-1.5 block text-sm font-medium text-gray-700">Fecha</label>
              <input
                id="cita-fecha"
                type="date"
                min={hoyISO()}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="input-field tabular-nums"
                required
              />
              {fechaLegible && <p className="mt-1 text-xs text-gray-500">{fechaLegible}</p>}
            </div>

            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-gray-700">Hora</legend>
              {cargandoSlots ? (
                <p className="flex items-center gap-2 py-2 text-sm text-gray-500" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Buscando horarios libres…
                </p>
              ) : horasMostradas.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                  {slotsMotivo || 'No quedan horarios libres este día.'} Prueba con otra fecha o revisa Horarios.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Horarios disponibles">
                  {horasMostradas.map((h) => (
                    <button
                      key={h}
                      type="button"
                      role="radio"
                      aria-checked={hora === h}
                      onClick={() => setHora(h)}
                      className={`min-h-[44px] rounded-lg border text-sm font-medium tabular-nums transition-colors ${
                        hora === h
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 bg-white text-gray-800 hover:border-primary-400 hover:bg-primary-50'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            {/* Asesor */}
            <div>
              <label htmlFor="cita-asesor" className="mb-1.5 block text-sm font-medium text-gray-700">Asesor</label>
              <select id="cita-asesor" value={asesorId} onChange={(e) => setAsesorId(e.target.value)} className="input-field">
                <option value="">Asignar al primero libre</option>
                {asesores.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>

            {/* Notas */}
            <div>
              <label htmlFor="cita-notas" className="mb-1.5 block text-sm font-medium text-gray-700">
                Notas <span className="font-normal text-gray-500">(opcional)</span>
              </label>
              <textarea
                id="cita-notas"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="input-field"
                placeholder="Ej. Llega con su pareja, pidió ver el jardín"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-3">
              <input
                type="checkbox"
                checked={notificarCliente}
                onChange={(e) => setNotificarCliente(e.target.checked)}
                className="checkbox-field mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium text-gray-900">
                  {editando ? 'Avisar el cambio por WhatsApp' : 'Enviar confirmación por WhatsApp'}
                </span>
                <span className="block text-gray-500">Le llega al prospecto desde tu WhatsApp conectado.</span>
              </span>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">{error}</p>
            )}
          </div>

          <div className="flex gap-3 border-t border-gray-200 bg-white px-4 py-3 pb-safe sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {editando ? 'Guardar cambios' : 'Agendar cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
