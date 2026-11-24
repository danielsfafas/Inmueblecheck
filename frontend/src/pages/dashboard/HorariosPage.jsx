import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Clock, Calendar, Settings, Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HorariosPage() {
  const [horarios, setHorarios] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [configuracion, setConfiguracion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('horarios'); // 'horarios' | 'cierres' | 'config'

  const [nuevoCierre, setNuevoCierre] = useState({
    fecha: '',
    diaCompleto: true,
    horaInicio: '',
    horaFin: '',
    motivo: '',
  });

  const diasSemana = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' },
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [horariosRes, cierresRes, configRes] = await Promise.all([
        api.get('/horarios'),
        api.get('/horarios/cierres/list'),
        api.get('/horarios/configuracion'),
      ]);
      setHorarios(horariosRes.data);
      setCierres(cierresRes.data);
      setConfiguracion(configRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarHorario = async (diaSemana, campo, valor) => {
    try {
      const horarioExistente = horarios.find(h => h.diaSemana === diaSemana) || {};
      const payload = {
        ...horarioExistente,
        [campo]: valor,
      };

      await api.put(`/horarios/${diaSemana}`, payload);
      await cargarDatos();
    } catch (error) {
      console.error('Error actualizando horario:', error);
      alert('Error al actualizar horario');
    }
  };

  const handleCrearCierre = async (e) => {
    e.preventDefault();
    
    if (!nuevoCierre.fecha || !nuevoCierre.motivo) {
      alert('Fecha y motivo son requeridos');
      return;
    }

    try {
      await api.post('/horarios/cierres', nuevoCierre);
      setNuevoCierre({
        fecha: '',
        diaCompleto: true,
        horaInicio: '',
        horaFin: '',
        motivo: '',
      });
      await cargarDatos();
      alert('Cierre creado');
    } catch (error) {
      console.error('Error creando cierre:', error);
      alert('Error al crear cierre');
    }
  };

  const handleEliminarCierre = async (cierreId) => {
    if (!confirm('¿Eliminar este cierre?')) return;

    try {
      await api.delete(`/horarios/cierres/${cierreId}`);
      await cargarDatos();
    } catch (error) {
      console.error('Error eliminando cierre:', error);
      alert('Error al eliminar cierre');
    }
  };

  const handleActualizarConfiguracion = async (campo, valor) => {
    try {
      await api.patch('/horarios/configuracion', { [campo]: parseInt(valor) });
      await cargarDatos();
      alert('Configuración actualizada');
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      alert('Error al actualizar configuración');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Horarios y Cierres</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configura los horarios de atención y cierres especiales
          </p>
        </div>
      </div>

      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setTab('horarios')}
            className={`${
              tab === 'horarios'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
          >
            <Clock className="h-5 w-5" />
            Horarios Semanales
          </button>
          <button
            onClick={() => setTab('cierres')}
            className={`${
              tab === 'cierres'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
          >
            <Calendar className="h-5 w-5" />
            Cierres
          </button>
          <button
            onClick={() => setTab('config')}
            className={`${
              tab === 'config'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
          >
            <Settings className="h-5 w-5" />
            Configuración
          </button>
        </nav>
      </div>

      {tab === 'horarios' && (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {diasSemana.map((dia) => {
                const horario = horarios.find(h => h.diaSemana === dia.value) || {
                  diaSemana: dia.value,
                  activo: true,
                  horaInicio: '09:00',
                  horaFin: '18:00',
                  pausaInicio: null,
                  pausaFin: null,
                };

                return (
                  <div key={dia.value} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center gap-4">
                      <div className="w-32 font-medium text-gray-900">{dia.label}</div>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={horario.activo}
                          onChange={(e) => handleActualizarHorario(dia.value, 'activo', e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Activo</span>
                      </label>

                      {horario.activo && (
                        <>
                          <input
                            type="time"
                            value={horario.horaInicio}
                            onChange={(e) => handleActualizarHorario(dia.value, 'horaInicio', e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <span className="text-gray-500">a</span>
                          <input
                            type="time"
                            value={horario.horaFin}
                            onChange={(e) => handleActualizarHorario(dia.value, 'horaFin', e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />

                          <span className="text-gray-500 ml-4">Pausa:</span>
                          <input
                            type="time"
                            value={horario.pausaInicio || ''}
                            onChange={(e) => handleActualizarHorario(dia.value, 'pausaInicio', e.target.value)}
                            placeholder="Inicio"
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <span className="text-gray-500">a</span>
                          <input
                            type="time"
                            value={horario.pausaFin || ''}
                            onChange={(e) => handleActualizarHorario(dia.value, 'pausaFin', e.target.value)}
                            placeholder="Fin"
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'cierres' && (
        <div className="mt-8 space-y-6">
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Agregar Cierre</h3>
            <form onSubmit={handleCrearCierre} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha</label>
                  <input
                    type="date"
                    value={nuevoCierre.fecha}
                    onChange={(e) => setNuevoCierre({ ...nuevoCierre, fecha: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Motivo</label>
                  <input
                    type="text"
                    value={nuevoCierre.motivo}
                    onChange={(e) => setNuevoCierre({ ...nuevoCierre, motivo: e.target.value })}
                    placeholder="Día festivo, evento especial..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={nuevoCierre.diaCompleto}
                      onChange={(e) => setNuevoCierre({ ...nuevoCierre, diaCompleto: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Día completo</span>
                  </label>
                </div>

                {!nuevoCierre.diaCompleto && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hora inicio</label>
                      <input
                        type="time"
                        value={nuevoCierre.horaInicio}
                        onChange={(e) => setNuevoCierre({ ...nuevoCierre, horaInicio: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hora fin</label>
                      <input
                        type="time"
                        value={nuevoCierre.horaFin}
                        onChange={(e) => setNuevoCierre({ ...nuevoCierre, horaFin: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Cierre
              </button>
            </form>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {cierres.length === 0 ? (
                <li className="px-6 py-8 text-center text-gray-500">
                  No hay cierres registrados
                </li>
              ) : (
                cierres.map((cierre) => (
                  <li key={cierre.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">
                            {format(parseISO(cierre.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                          </span>
                          {!cierre.diaCompleto && (
                            <span className="text-sm text-gray-500">
                              {cierre.horaInicio} - {cierre.horaFin}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{cierre.motivo}</p>
                      </div>
                      <button
                        onClick={() => handleEliminarCierre(cierre.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {tab === 'config' && configuracion && (
        <div className="mt-8 bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración General</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Duración de cita (minutos)
              </label>
              <input
                type="number"
                value={configuracion.duracionCitaMin}
                onChange={(e) => handleActualizarConfiguracion('duracionCitaMin', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tiempo de antelación mínimo (minutos)
              </label>
              <input
                type="number"
                value={configuracion.tiempoAntelacionMin}
                onChange={(e) => handleActualizarConfiguracion('tiempoAntelacionMin', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Tiempo mínimo requerido entre ahora y la cita
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Días adelante para agendar
              </label>
              <input
                type="number"
                value={configuracion.diasConCitasAdelante}
                onChange={(e) => handleActualizarConfiguracion('diasConCitasAdelante', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Ventana de días disponibles para agendar citas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Horas de auto-resume bot después de AGENTE
              </label>
              <input
                type="number"
                value={configuracion.horasAutoresumeBotPausa}
                onChange={(e) => handleActualizarConfiguracion('horasAutoresumeBotPausa', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
