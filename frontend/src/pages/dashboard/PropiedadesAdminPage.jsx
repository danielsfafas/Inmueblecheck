import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Eye, Video, Film } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import VideoManager from '../../components/VideoManager';

export default function PropiedadesAdminPage() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoManagerOpen, setVideoManagerOpen] = useState(false);
  const [selectedPropiedadId, setSelectedPropiedadId] = useState(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Propiedades</h1>
      </div>

      <div className="overflow-hidden bg-white rounded-lg shadow">
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => generarVideo(propiedad.id)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
                      title="Generar video vertical 9:16"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Generar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPropiedadId(propiedad.id);
                        setVideoManagerOpen(true);
                      }}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                      title="Gestionar videos de la propiedad"
                    >
                      <Film className="w-4 h-4 mr-2" />
                      Videos
                    </button>
                  </div>
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

      {/* Modal de gestión de videos */}
      {videoManagerOpen && selectedPropiedadId && (
        <VideoManager
          propiedadId={selectedPropiedadId}
          onClose={() => {
            setVideoManagerOpen(false);
            setSelectedPropiedadId(null);
          }}
        />
      )}
    </div>
  );
}
