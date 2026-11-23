import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Search, Filter } from 'lucide-react';
import { formatRelativeTime, getCalificacionColor, getCalificacionLabel, getEtapaColor, getEtapaLabel } from '../../utils/formatters';
import toast from 'react-hot-toast';
import ProspectoNuevoModal from '../../components/ProspectoNuevoModal';

export default function ProspectosPage() {
  const [searchParams] = useSearchParams();
  const [prospectos, setProspectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [filtros, setFiltros] = useState({
    etapa: searchParams.get('etapa') || '',
    calificacion: searchParams.get('calificacion') || '',
    busqueda: '',
  });

  useEffect(() => {
    cargarProspectos();
  }, [filtros.etapa, filtros.calificacion]);

  const cargarProspectos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtros.etapa) params.etapa = filtros.etapa;
      if (filtros.calificacion) params.calificacion = filtros.calificacion;

      const { data } = await api.get('/prospectos', { params });
      setProspectos(data);
    } catch (error) {
      toast.error('Error al cargar prospectos');
    } finally {
      setLoading(false);
    }
  };

  const prospectosFiltrados = prospectos.filter((p) => {
    if (!filtros.busqueda) return true;
    const busqueda = filtros.busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(busqueda) ||
      p.telefono.includes(busqueda) ||
      (p.email && p.email.toLowerCase().includes(busqueda))
    );
  });

  // Agrupar por etapa para vista kanban
  const prospectosPorEtapa = {
    NUEVO: prospectosFiltrados.filter((p) => p.etapa === 'NUEVO'),
    CONTACTADO: prospectosFiltrados.filter((p) => p.etapa === 'CONTACTADO'),
    VISITA: prospectosFiltrados.filter((p) => p.etapa === 'VISITA'),
    OFERTA: prospectosFiltrados.filter((p) => p.etapa === 'OFERTA'),
    APARTADO: prospectosFiltrados.filter((p) => p.etapa === 'APARTADO'),
    CERRADO: prospectosFiltrados.filter((p) => p.etapa === 'CERRADO'),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Prospectos</h1>
        <button
          onClick={() => setModalNuevoOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Prospecto
        </button>
      </div>

      <ProspectoNuevoModal
        isOpen={modalNuevoOpen}
        onClose={() => setModalNuevoOpen(false)}
        onSuccess={() => {
          toast.success('Prospecto creado exitosamente');
          cargarProspectos();
        }}
      />

      {/* Filtros */}
      <div className="p-4 mb-6 space-y-4 bg-white rounded-lg shadow">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o email..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <select
              value={filtros.etapa}
              onChange={(e) => setFiltros({ ...filtros, etapa: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todas las etapas</option>
              <option value="NUEVO">Nuevo</option>
              <option value="CONTACTADO">Contactado</option>
              <option value="VISITA">Visita</option>
              <option value="OFERTA">Oferta</option>
              <option value="APARTADO">Apartado</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </div>

          <div>
            <select
              value={filtros.calificacion}
              onChange={(e) => setFiltros({ ...filtros, calificacion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todas las calificaciones</option>
              <option value="CALIENTE">Caliente</option>
              <option value="TIBIO">Tibio</option>
              <option value="FRIO">Frío</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vista Kanban */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Cargando...</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-6">
          {Object.entries(prospectosPorEtapa).map(([etapa, prospectos]) => (
            <div key={etapa} className="flex flex-col">
              <div className="p-3 mb-3 bg-white rounded-lg shadow">
                <h3 className="font-semibold text-gray-900">{getEtapaLabel(etapa)}</h3>
                <p className="text-sm text-gray-600">{prospectos.length}</p>
              </div>

              <div className="flex-1 space-y-3">
                {prospectos.map((prospecto) => (
                  <Link
                    key={prospecto.id}
                    to={`/admin/prospectos/${prospecto.id}`}
                    className="block p-4 transition-shadow bg-white rounded-lg shadow hover:shadow-lg"
                  >
                    <h4 className="mb-2 font-medium text-gray-900">{prospecto.nombre}</h4>
                    <p className="mb-2 text-sm text-gray-600">{prospecto.telefono}</p>

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCalificacionColor(prospecto.calificacion)}`}>
                        {getCalificacionLabel(prospecto.calificacion)}
                      </span>
                      {prospecto.ejecutivo && (
                        <span className="text-xs text-gray-500">{prospecto.ejecutivo.nombre}</span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-500">{formatRelativeTime(prospecto.createdAt)}</p>
                  </Link>
                ))}

                {prospectos.length === 0 && (
                  <div className="p-4 text-sm text-center text-gray-500 bg-gray-50 rounded-lg">
                    Sin prospectos
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
