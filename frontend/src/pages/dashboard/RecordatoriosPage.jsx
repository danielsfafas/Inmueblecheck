import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Calendar, Clock, Check, Plus } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';
import RecordatorioFormModal from '../../components/RecordatorioFormModal';

export default function RecordatoriosPage() {
  const [recordatorios, setRecordatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendientes');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    cargarRecordatorios();
  }, [filtro]);

  const cargarRecordatorios = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtro === 'pendientes') params.completado = false;
      if (filtro === 'vencidos') params.vencidos = true;

      const { data } = await api.get('/recordatorios', { params });
      setRecordatorios(data);
    } catch (error) {
      toast.error('Error al cargar recordatorios');
    } finally {
      setLoading(false);
    }
  };

  const marcarCompletado = async (id) => {
    try {
      await api.put(`/recordatorios/${id}/completar`);
      toast.success('Recordatorio marcado como completado');
      cargarRecordatorios();
    } catch (error) {
      toast.error('Error al marcar recordatorio');
    }
  };

  const estaVencido = (fecha) => {
    return new Date(fecha) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recordatorios</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Recordatorio
        </button>
      </div>

      <div className="mb-6">
        <div className="inline-flex p-1 space-x-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setFiltro('pendientes')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              filtro === 'pendientes'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltro('vencidos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              filtro === 'vencidos'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Vencidos
          </button>
          <button
            onClick={() => setFiltro('todos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              filtro === 'todos'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {recordatorios.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg shadow">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No hay recordatorios {filtro}</p>
          </div>
        ) : (
          recordatorios.map((recordatorio) => (
            <div
              key={recordatorio.id}
              className={`p-4 sm:p-6 bg-white rounded-lg shadow ${
                estaVencido(recordatorio.fechaRecordatorio) && !recordatorio.completado
                  ? 'ring-1 ring-red-300'
                  : ''
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {!recordatorio.completado && estaVencido(recordatorio.fechaRecordatorio) && (
                      <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded">
                        Vencido
                      </span>
                    )}
                    {recordatorio.completado && (
                      <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded">
                        Completado
                      </span>
                    )}
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-gray-900">{recordatorio.titulo}</h3>
                  
                  {recordatorio.descripcion && (
                    <p className="mb-3 text-gray-600">{recordatorio.descripcion}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDateTime(recordatorio.fechaRecordatorio)}
                    </div>
                    {recordatorio.prospecto && (
                      <div>
                        Prospecto: <span className="font-medium">{recordatorio.prospecto.nombre}</span>
                      </div>
                    )}
                    {recordatorio.usuario && (
                      <div>
                        Asignado a: <span className="font-medium">{recordatorio.usuario.nombre}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!recordatorio.completado && (
                  <button
                    onClick={() => marcarCompletado(recordatorio.id)}
                    className="flex items-center justify-center self-stretch sm:self-start min-h-[44px] px-4 py-2 sm:ml-4 text-sm font-medium text-white transition-colors bg-green-700 rounded-lg hover:bg-green-800"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Completar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <RecordatorioFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          cargarRecordatorios();
        }}
      />
    </div>
  );
}
