import { useState, useEffect } from 'react';
import { Youtube, Upload, Trash2, MoveUp, MoveDown, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function VideoManager({ propiedadId, onClose }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarVideos();
  }, [propiedadId]);

  const cargarVideos = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/propiedades/${propiedadId}/videos`);
      setVideos(data);
    } catch (error) {
      toast.error('Error al cargar videos');
    } finally {
      setLoading(false);
    }
  };

  const agregarYouTube = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Por favor ingresa una URL de YouTube');
      return;
    }

    try {
      setError(null);
      await api.post(`/propiedades/${propiedadId}/videos/youtube`, {
        url: youtubeUrl,
        orden: videos.length,
      });
      toast.success('Video de YouTube agregado');
      setYoutubeUrl('');
      cargarVideos();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al agregar video de YouTube';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const subirVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamaño (200 MB)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('El archivo excede el tamaño máximo de 200 MB');
      toast.error('El archivo excede el tamaño máximo de 200 MB');
      return;
    }

    // Validar tipo
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten archivos MP4, WebM o MOV');
      toast.error('Solo se permiten archivos MP4, WebM o MOV');
      return;
    }

    try {
      setError(null);
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('video', file);
      formData.append('orden', videos.length);

      await api.post(`/propiedades/${propiedadId}/videos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      toast.success('Video subido exitosamente');
      setUploadProgress(0);
      e.target.value = '';
      cargarVideos();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al subir video';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const cambiarOrden = async (videoId, direccion) => {
    const index = videos.findIndex(v => v.id === videoId);
    if (index === -1) return;

    const nuevoOrden = direccion === 'up' ? videos[index].orden - 1 : videos[index].orden + 1;
    if (nuevoOrden < 0 || nuevoOrden >= videos.length) return;

    try {
      await api.patch(`/propiedades/${propiedadId}/videos/${videoId}/orden`, { orden: nuevoOrden });
      cargarVideos();
    } catch (error) {
      toast.error('Error al cambiar orden');
    }
  };

  const eliminarVideo = async (videoId) => {
    if (!confirm('¿Estás seguro de eliminar este video?')) return;

    try {
      await api.delete(`/propiedades/${propiedadId}/videos/${videoId}`);
      toast.success('Video eliminado');
      cargarVideos();
    } catch (error) {
      toast.error('Error al eliminar video');
    }
  };

  const getVideoPreview = (video) => {
    if (video.tipo === 'YOUTUBE') {
      return (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          className="w-full rounded aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
        />
      );
    } else {
      return (
        <video
          src={video.archivoUrl}
          controls
          preload="metadata"
          className="w-full rounded"
        >
          Tu navegador no soporta video HTML5.
        </video>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-4xl overflow-hidden bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Gestionar Videos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Error global */}
          {error && (
            <div className="flex items-center gap-2 p-4 mb-4 text-red-800 bg-red-100 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Agregar YouTube */}
          <div className="p-4 mb-6 border border-gray-200 rounded-lg">
            <div className="flex items-center mb-3">
              <Youtube className="w-5 h-5 mr-2 text-red-600" />
              <h3 className="font-semibold text-gray-900">Agregar Video de YouTube</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={agregarYouTube}
                className="px-4 py-2 font-medium text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Agregar
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Acepta: youtube.com/watch, youtu.be, youtube.com/shorts
            </p>
          </div>

          {/* Subir archivo */}
          <div className="p-4 mb-6 border border-gray-200 rounded-lg">
            <div className="flex items-center mb-3">
              <Upload className="w-5 h-5 mr-2 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Subir Video desde Archivo</h3>
            </div>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={subirVideo}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {uploading && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-gray-600">Subiendo...</span>
                  <span className="font-medium text-gray-900">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                  <div
                    className="h-full transition-all bg-blue-600"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Formatos: MP4, WebM, MOV. Tamaño máximo: 200 MB
            </p>
          </div>

          {/* Lista de videos */}
          <div>
            <h3 className="mb-3 font-semibold text-gray-900">
              Videos ({videos.length})
            </h3>
            
            {loading ? (
              <p className="text-center text-gray-600">Cargando videos...</p>
            ) : videos.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border-2 border-gray-200 border-dashed rounded-lg">
                <p>No hay videos agregados</p>
                <p className="text-sm">Agrega un video de YouTube o sube un archivo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {videos.map((video, index) => (
                  <div key={video.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Preview */}
                      <div>
                        {getVideoPreview(video)}
                      </div>

                      {/* Info y controles */}
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {video.tipo === 'YOUTUBE' ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded">
                                <Youtube className="w-3 h-3 mr-1" />
                                YouTube
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded">
                                <Upload className="w-3 h-3 mr-1" />
                                Archivo
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              Orden: {video.orden + 1}
                            </span>
                          </div>
                          {video.tipo === 'YOUTUBE' && (
                            <p className="text-xs text-gray-600 break-all">
                              ID: {video.youtubeId}
                            </p>
                          )}
                        </div>

                        {/* Botones */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => cambiarOrden(video.id, 'up')}
                            disabled={index === 0}
                            className="flex items-center justify-center p-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Mover arriba"
                          >
                            <MoveUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cambiarOrden(video.id, 'down')}
                            disabled={index === videos.length - 1}
                            className="flex items-center justify-center p-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Mover abajo"
                          >
                            <MoveDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarVideo(video.id)}
                            className="flex items-center justify-center flex-1 p-2 text-red-700 transition-colors border border-red-300 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
