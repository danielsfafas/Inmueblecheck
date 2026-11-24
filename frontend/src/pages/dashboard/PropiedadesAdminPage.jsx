import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Eye, Video, Film, Edit, Image } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import VideoManager from '../../components/VideoManager';
import PropiedadFormModal from '../../components/PropiedadFormModal';
import PropiedadFotosManager from '../../components/PropiedadFotosManager';

export default function PropiedadesAdminPage() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoManagerOpen, setVideoManagerOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [fotosManagerOpen, setFotosManagerOpen] = useState(false);
  const [selectedPropiedadId, setSelectedPropiedadId] = useState(null);
  const [editingPropiedadId, setEditingPropiedadId] = useState(null);

  useEffect(() => {
    cargarPropiedades();
  }, []);

  const cargarPropiedades = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/propiedades');
      setPropiedades(data);
    } catch (error) {
      toast.error('Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  };

  const generarVideo = async (propiedadId) => {
    try {
      toast.loading('Generando video...', { id: 'video-gen' });
      
      // 1. POST para generar el video (retorna JSON)
      const { data: result } = await api.post(`/videos/propiedades/${propiedadId}/generar`);

      if (!result.success) {
        toast.error(result.message || 'Error al generar video', { id: 'video-gen' });
        return;
      }

      toast.loading('Descargando video...', { id: 'video-gen' });

      // 2. GET al video.url con blob response
      // El backend retorna '/api/videos/files/...' pero api.js ya tiene baseURL '/api'
      // Quitamos el prefijo '/api' para evitar duplicación: /api/api/videos/files/...
      const videoUrl = result.video.url.replace(/^\/api/, ''); // videos/files/propiedad-<id>.mp4
      const response = await api.get(videoUrl, {
        responseType: 'blob',
      });

      // 3. Crear URL del blob y descargarlo
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'video/mp4' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `propiedad-${propiedadId}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Video descargado exitosamente', { id: 'video-gen' });
    } catch (error) {
      console.error('Error al generar video:', error);
      toast.error(error.response?.data?.message || 'Error al generar/descargar video', { id: 'video-gen' });
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'DISPONIBLE':
        return 'bg-green-100 text-green-800';
      case 'APARTADA':
        return 'bg-yellow-100 text-yellow-800';
      case 'VENDIDA':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'APARTADA':
        return 'Apartada';
      case 'VENDIDA':
        return 'Vendida';
      default:
        return estado;
    }
  };

  const renderAcciones = (propiedad, compact = false) => (
    <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-2 sm:grid-cols-4'}>
      <button
        onClick={() => {
          setEditingPropiedadId(propiedad.id);
          setFormModalOpen(true);
        }}
        className={`inline-flex items-center justify-center ${compact ? 'px-2 py-1 text-xs' : 'min-h-[44px] px-3 text-sm'} font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg`}
        title="Editar propiedad"
      >
        <Edit className={compact ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
        Editar
      </button>
      <button
        onClick={() => {
          setSelectedPropiedadId(propiedad.id);
          setFotosManagerOpen(true);
        }}
        className={`inline-flex items-center justify-center ${compact ? 'px-2 py-1 text-xs' : 'min-h-[44px] px-3 text-sm'} font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg`}
        title="Gestionar fotos"
      >
        <Image className={compact ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
        Fotos
      </button>
      <button
        onClick={() => {
          setSelectedPropiedadId(propiedad.id);
          setVideoManagerOpen(true);
        }}
        className={`inline-flex items-center justify-center ${compact ? 'px-2 py-1 text-xs' : 'min-h-[44px] px-3 text-sm'} font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg`}
        title="Gestionar videos"
      >
        <Film className={compact ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
        Videos
      </button>
      <button
        onClick={() => generarVideo(propiedad.id)}
        className={`inline-flex items-center justify-center ${compact ? 'px-2 py-1 text-xs' : 'min-h-[44px] px-3 text-sm'} font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg`}
        title="Generar video vertical 9:16"
      >
        <Video className={compact ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
        Generar
      </button>
    </div>
  );

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Propiedades</h1>
        <button
          onClick={() => {
            setEditingPropiedadId(null);
            setFormModalOpen(true);
          }}
          className="flex items-center min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Propiedad
        </button>
      </div>

      {/* Móvil y tablet: tarjetas */}
      <ul className="lg:hidden space-y-3">
        {propiedades.map((propiedad) => (
          <li key={propiedad.id} className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 break-words">{propiedad.titulo}</p>
                <p className="text-sm text-gray-500">
                  {propiedad.tipo === 'VENTA' ? 'Venta' : 'Renta'}
                  {(propiedad.colonia || propiedad.ciudad) && ' · '}
                  {[propiedad.colonia, propiedad.ciudad].filter(Boolean).join(', ')}
                </p>
              </div>
              <span className={`shrink-0 px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(propiedad.estadoPropiedad)}`}>
                {getEstadoLabel(propiedad.estadoPropiedad)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="text-lg font-semibold text-gray-900 tabular-nums">{formatCurrency(propiedad.precio)}</span>
              <span className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center"><Eye className="w-4 h-4 mr-1" />{propiedad.vistas || 0}</span>
                <span>WhatsApp: {propiedad.clicsWhatsapp || 0}</span>
              </span>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">{renderAcciones(propiedad)}</div>
          </li>
        ))}
        {propiedades.length === 0 && (
          <li className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-600">No hay propiedades registradas</p>
          </li>
        )}
      </ul>

      <div className="hidden lg:block overflow-hidden bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Propiedad
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Ubicación
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Precio
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Métricas
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {propiedades.map((propiedad) => (
              <tr key={propiedad.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div>
                      <div className="font-medium text-gray-900">{propiedad.titulo}</div>
                      <div className="text-sm text-gray-500">
                        {propiedad.tipo === 'VENTA' ? 'Venta' : 'Renta'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{propiedad.colonia}</div>
                  <div className="text-sm text-gray-500">{propiedad.ciudad}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{formatCurrency(propiedad.precio)}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(propiedad.estadoPropiedad)}`}>
                    {getEstadoLabel(propiedad.estadoPropiedad)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {propiedad.vistas || 0}
                    </div>
                    <div>
                      WhatsApp: {propiedad.clicsWhatsapp || 0}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {renderAcciones(propiedad, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {propiedades.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-600">No hay propiedades registradas</p>
          </div>
        )}
      </div>

      {/* Modales */}
      <PropiedadFormModal
        isOpen={formModalOpen}
        propiedadId={editingPropiedadId}
        onClose={() => {
          setFormModalOpen(false);
          setEditingPropiedadId(null);
        }}
        onSuccess={() => {
          cargarPropiedades();
          if (!editingPropiedadId) {
            setTimeout(() => {
              toast('Ahora agrega fotos y videos a tu propiedad', { icon: '📸' });
            }, 500);
          }
        }}
      />

      {fotosManagerOpen && selectedPropiedadId && (
        <PropiedadFotosManager
          propiedadId={selectedPropiedadId}
          onClose={() => {
            setFotosManagerOpen(false);
            setSelectedPropiedadId(null);
            cargarPropiedades();
          }}
        />
      )}

      {videoManagerOpen && selectedPropiedadId && (
        <VideoManager
          propiedadId={selectedPropiedadId}
          onClose={() => {
            setVideoManagerOpen(false);
            setSelectedPropiedadId(null);
            cargarPropiedades();
          }}
        />
      )}
    </div>
  );
}
