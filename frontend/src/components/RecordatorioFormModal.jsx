import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function RecordatorioFormModal({ isOpen, onClose, onSuccess, prospectoId = null }) {
  const [loading, setLoading] = useState(false);
  const [prospectos, setProspectos] = useState([]);
  const [formData, setFormData] = useState({
    prospectoId: prospectoId || '',
    titulo: '',
    descripcion: '',
    fechaRecordatorio: '',
  });

  useEffect(() => {
    if (isOpen && !prospectoId) {
      cargarProspectos();
    }
  }, [isOpen, prospectoId]);

  const cargarProspectos = async () => {
    try {
      const { data } = await api.get('/prospectos');
      setProspectos(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/recordatorios', {
        ...formData,
        prospectoId: prospectoId || formData.prospectoId,
      });

      toast.success('Recordatorio creado');
      onSuccess?.();
      onClose();

      setFormData({
        prospectoId: prospectoId || '',
        titulo: '',
        descripcion: '',
        fechaRecordatorio: '',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear recordatorio');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl max-w-md w-full max-h-[92dvh] overflow-y-auto overscroll-contain pb-safe sm:pb-0">
        <div className="px-4 sm:px-6 py-2 sm:py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Nuevo Recordatorio</h2>
          </div>
          <button type="button" onClick={onClose} className="tap-target -mr-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!prospectoId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prospecto *
              </label>
              <select
                required
                value={formData.prospectoId}
                onChange={(e) => setFormData({ ...formData, prospectoId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar prospecto</option>
                {prospectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} - {p.telefono}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              required
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Llamar al prospecto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha y Hora *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.fechaRecordatorio}
              onChange={(e) => setFormData({ ...formData, fechaRecordatorio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Recordatorio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
