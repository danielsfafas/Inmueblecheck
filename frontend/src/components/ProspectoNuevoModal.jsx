import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, DollarSign, Users, Building, FileText } from 'lucide-react';
import api from '../services/api';

export default function ProspectoNuevoModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ejecutivos, setEjecutivos] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    presupuesto: '',
    formaPago: '',
    origen: 'Manual - Panel Admin',
    etapa: 'NUEVO',
    ejecutivoId: '',
    notas: '',
    propiedadesInteres: [],
  });

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  const cargarDatos = async () => {
    try {
      // Cargar ejecutivos del tenant
      const usersRes = await api.get('/auth/usuarios');
      setEjecutivos(usersRes.data || []);
      
      // Cargar propiedades disponibles
      const propsRes = await api.get('/propiedades');
      setPropiedades(propsRes.data || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSend = {
        ...formData,
        presupuesto: formData.presupuesto ? parseFloat(formData.presupuesto) : null,
        ejecutivoId: formData.ejecutivoId || null,
      };

      await api.post('/prospectos', dataToSend);
      
      onSuccess?.();
      onClose();
      
      // Reset form
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        presupuesto: '',
        formaPago: '',
        origen: 'Manual - Panel Admin',
        etapa: 'NUEVO',
        ejecutivoId: '',
        notas: '',
        propiedadesInteres: [],
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear prospecto');
    } finally {
      setLoading(false);
    }
  };

  const togglePropiedad = (propId) => {
    setFormData(prev => ({
      ...prev,
      propiedadesInteres: prev.propiedadesInteres.includes(propId)
        ? prev.propiedadesInteres.filter(id => id !== propId)
        : [...prev.propiedadesInteres, propId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Nuevo Prospecto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Datos básicos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5512345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="juan@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Presupuesto (opcional)
                </label>
                <input
                  type="number"
                  value={formData.presupuesto}
                  onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2000000"
                />
              </div>
            </div>
          </div>

          {/* Forma de pago y asignación */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Detalles Comerciales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Pago
                </label>
                <select
                  value={formData.formaPago}
                  onChange={(e) => setFormData({ ...formData, formaPago: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin especificar</option>
                  <option value="Contado">Contado</option>
                  <option value="Crédito bancario">Crédito bancario</option>
                  <option value="Infonavit">Infonavit</option>
                  <option value="Fovissste">Fovissste</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Users className="w-4 h-4 inline mr-1" />
                  Asesor Asignado
                </label>
                <select
                  value={formData.ejecutivoId}
                  onChange={(e) => setFormData({ ...formData, ejecutivoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin asignar</option>
                  {ejecutivos.map((ejecutivo) => (
                    <option key={ejecutivo.id} value={ejecutivo.id}>
                      {ejecutivo.nombre} ({ejecutivo.rol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etapa
                </label>
                <select
                  value={formData.etapa}
                  onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="NUEVO">Nuevo</option>
                  <option value="CONTACTADO">Contactado</option>
                  <option value="VISITA">Visita</option>
                  <option value="OFERTA">Oferta</option>
                  <option value="APARTADO">Apartado</option>
                  <option value="CERRADO">Cerrado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Origen
                </label>
                <input
                  type="text"
                  value={formData.origen}
                  onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Notas Adicionales
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Información adicional sobre el prospecto..."
            />
          </div>

          {/* Propiedades de interés */}
          {propiedades.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Propiedades de Interés (opcional)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                {propiedades.map((prop) => (
                  <label
                    key={prop.id}
                    className="flex items-center py-2 px-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.propiedadesInteres.includes(prop.id)}
                      onChange={() => togglePropiedad(prop.id)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-900">
                      {prop.titulo} - ${prop.precio.toLocaleString()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Prospecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
