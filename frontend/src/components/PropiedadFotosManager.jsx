import { useState, useEffect } from 'react';
import { X, Upload, Trash2, ArrowUp, ArrowDown, Star } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { mediaUrl } from '../utils/mediaUrl';

export default function PropiedadFotosManager({ propiedadId, onClose }) {
  const [fotos, setFotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  useEffect(() => {
    cargarFotos();
  }, [propiedadId]);

  const cargarFotos = async () => {
    try {
      const { data } = await api.get(`/propiedades/${propiedadId}`);
      setFotos(data.fotos || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validar tipos
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Solo se permiten archivos JPG, PNG y WebP');
      return;
    }

    // Validar tamaños
    const maxSize = 10 * 1024 * 1024; // 10 MB
    const oversized = files.filter(f => f.size > maxSize);
    
    if (oversized.length > 0) {
      toast.error(`Algunas fotos superan el límite de 10 MB`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('fotos', file));

      const { data } = await api.post(`/propiedades/${propiedadId}/fotos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({ percent: percentCompleted });
        },
      });

      setFotos(data.fotos || []);
      toast.success(`${files.length} foto(s) subida(s)`);
      setUploadProgress({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir fotos');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const eliminarFoto = async (fotoUrl) => {
    if (!confirm('¿Eliminar esta foto?')) return;

    try {
      const { data } = await api.delete(`/propiedades/${propiedadId}/fotos`, {
        data: { fotoUrl },
      });
      setFotos(data.fotos || []);
      toast.success('Foto eliminada');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const moverFoto = async (index, direction) => {
    const newFotos = [...fotos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFotos.length) return;

    [newFotos[index], newFotos[targetIndex]] = [newFotos[targetIndex], newFotos[index]];

    try {
      await api.patch(`/propiedades/${propiedadId}/fotos/orden`, {
        fotos: newFotos,
      });
      setFotos(newFotos);
    } catch (err) {
      toast.error('Error al reordenar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Gestión de Fotos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Upload */}
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {uploading ? (
                    <span>Subiendo... {uploadProgress.percent}%</span>
                  ) : (
                    <>Click para subir fotos (JPG, PNG, WebP - máx 10 MB c/u)</>
                  )}
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {uploading && uploadProgress.percent > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lista de fotos */}
          {fotos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay fotos. Sube algunas para empezar.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>La primera foto es la portada</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative group border rounded-lg overflow-hidden">
                    <img
                      src={mediaUrl(foto)}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />

                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Portada
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {index > 0 && (
                        <button
                          onClick={() => moverFoto(index, 'up')}
                          className="p-2 bg-white rounded-lg hover:bg-gray-100"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      )}

                      {index < fotos.length - 1 && (
                        <button
                          onClick={() => moverFoto(index, 'down')}
                          className="p-2 bg-white rounded-lg hover:bg-gray-100"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => eliminarFoto(foto)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      {index + 1} / {fotos.length}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
