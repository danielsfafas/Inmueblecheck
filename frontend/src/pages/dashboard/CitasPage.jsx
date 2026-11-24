import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, List, Plus, Filter } from 'lucide-react';

export default function CitasPage() {
  const navigate = useNavigate();
  
  const [vista, setVista] = useState('list'); // 'list' o 'week'
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    estado: '',
    asesorId: '',
    propiedadId: '',
  });
  const [asesores, setAsesores] = useState([]);
  const [semanaInicio, setSemanaInicio] = useState(startOfWeek(new Date(), { locale: es }));

  useEffect(() => {
    cargarCitas();
    cargarAsesores();
  }, [filtros]);

  const cargarCitas = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.asesorId) params.asesorId = filtros.asesorId;
      if (filtros.propiedadId) params.propiedadId = filtros.propiedadId;

      const { data } = await api.get('/citas', { params });
      setCitas(data);
    } catch (error) {
      console.error('Error cargando citas:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarAsesores = async () => {
    try {
      // TODO: endpoint /api/usuarios?rol=EJECUTIVO
      setAsesores([]);
    } catch (error) {
      console.error('Error cargando asesores:', error);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      CONFIRMADA: 'bg-green-100 text-green-800',
      COMPLETADA: 'bg-blue-100 text-blue-800',
      CANCELADA: 'bg-red-100 text-red-800',
      NO_ASISTIO: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[estado] || badges.PENDIENTE}`}>
        {estado.replace('_', ' ')}
      </span>
    );
  };

  const handleCambiarEstado = async (citaId, nuevoEstado) => {
    if (!confirm(`¿Cambiar estado a ${nuevoEstado}?`)) return;

    try {
      await api.patch(`/citas/${citaId}`, { estado: nuevoEstado });
      await cargarCitas();
      alert('Estado actualizado');
    } catch (error) {
      console.error('Error actualizando cita:', error);
      alert('Error al actualizar estado');
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
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Citas</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona las citas y visitas de tus prospectos
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={() => setVista('list')}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
              vista === 'list'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </button>
          
          <button
            onClick={() => setVista('week')}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
              vista === 'week'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Semana
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <select
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="CONFIRMADA">Confirmada</option>
          <option value="COMPLETADA">Completada</option>
          <option value="CANCELADA">Cancelada</option>
          <option value="NO_ASISTIO">No Asistió</option>
        </select>
      </div>

      {vista === 'list' ? (
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              {citas.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay citas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Las citas agendadas aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Fecha/Hora
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Prospecto
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Propiedad
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Asesor
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Estado
                        </th>
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {citas.map((cita) => (
                        <tr key={cita.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {format(parseISO(cita.fecha), 'dd/MM/yyyy', { locale: es })}
                            <br />
                            <span className="text-gray-500">{cita.hora}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {cita.prospecto.nombre}
                            <br />
                            <span className="text-gray-500 text-xs">{cita.prospecto.telefono}</span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {cita.propiedad ? (
                              <>
                                {cita.propiedad.titulo}
                                <br />
                                <span className="text-gray-500 text-xs">{cita.propiedad.colonia}</span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">Sin propiedad</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {cita.asesor?.nombre || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {getEstadoBadge(cita.estado)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            {cita.estado === 'PENDIENTE' && (
                              <button
                                onClick={() => handleCambiarEstado(cita.id, 'CONFIRMADA')}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                Confirmar
                              </button>
                            )}
                            {['PENDIENTE', 'CONFIRMADA'].includes(cita.estado) && (
                              <button
                                onClick={() => handleCambiarEstado(cita.id, 'CANCELADA')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Cancelar
                              </button>
                            )}
                            {cita.estado === 'CONFIRMADA' && (
                              <button
                                onClick={() => handleCambiarEstado(cita.id, 'COMPLETADA')}
                                className="text-blue-600 hover:text-blue-900 ml-3"
                              >
                                Completar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <p className="text-center text-gray-500">
            Vista de semana próximamente
          </p>
        </div>
      )}
    </div>
  );
}
