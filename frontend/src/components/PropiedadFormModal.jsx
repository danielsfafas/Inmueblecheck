import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function PropiedadFormModal({ isOpen, onClose, onSuccess, propiedadId = null }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'VENTA',
    precio: '',
    colonia: '',
    ciudad: '',
    estado: 'Hidalgo',
    codigoPostal: '',
    latitud: '',
    longitud: '',
    metrosTerreno: '',
    metrosConstruccion: '',
    recamaras: 2,
    banos: 1,
    estacionamientos: 0,
    aceptaContado: true,
    aceptaBancario: false,
    aceptaInfonavit: false,
    aceptaFovissste: false,
    estadoPropiedad: 'DISPONIBLE',
  });

  useEffect(() => {
    if (isOpen && propiedadId) {
      cargarPropiedad();
    }
  }, [isOpen, propiedadId]);

  const cargarPropiedad = async () => {
    try {
      const { data } = await api.get(`/propiedades/${propiedadId}`);
      setFormData({
        titulo: data.titulo || '',
        descripcion: data.descripcion || '',
        tipo: data.tipo || 'VENTA',
        precio: data.precio?.toString() || '',
        colonia: data.colonia || '',
        ciudad: data.ciudad || '',
        estado: data.estado || 'Hidalgo',
        codigoPostal: data.codigoPostal || '',
        latitud: data.latitud?.toString() || '',
        longitud: data.longitud?.toString() || '',
        metrosTerreno: data.metrosTerreno?.toString() || '',
        metrosConstruccion: data.metrosConstruccion?.toString() || '',
        recamaras: data.recamaras || 2,
        banos: data.banos || 1,
        estacionamientos: data.estacionamientos || 0,
        aceptaContado: data.aceptaContado ?? true,
        aceptaBancario: data.aceptaBancario ?? false,
        aceptaInfonavit: data.aceptaInfonavit ?? false,
        aceptaFovissste: data.aceptaFovissste ?? false,
        estadoPropiedad: data.estadoPropiedad || 'DISPONIBLE',
      });
    } catch (err) {
      toast.error('Error al cargar propiedad');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        precio: parseFloat(formData.precio),
        recamaras: parseInt(formData.recamaras),
        banos: parseInt(formData.banos),
        estacionamientos: parseInt(formData.estacionamientos),
        metrosTerreno: formData.metrosTerreno ? parseFloat(formData.metrosTerreno) : null,
        metrosConstruccion: parseFloat(formData.metrosConstruccion),
        latitud: formData.latitud ? parseFloat(formData.latitud) : null,
        longitud: formData.longitud ? parseFloat(formData.longitud) : null,
        fotos: [],
      };

      if (propiedadId) {
        await api.put(`/propiedades/${propiedadId}`, payload);
        toast.success('Propiedad actualizada');
      } else {
        await api.post('/propiedades', payload);
        toast.success('Propiedad creada');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold">{propiedadId ? 'Editar' : 'Nueva'} Propiedad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Básicos */}
          <div>
            <h3 className="font-medium mb-3">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Casa en venta..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Operación *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="VENTA">Venta</option>
                  <option value="RENTA">Renta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Precio *</label>
                <input
                  type="number"
                  required
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado Propiedad</label>
                <select
                  value={formData.estadoPropiedad}
                  onChange={(e) => setFormData({ ...formData, estadoPropiedad: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="APARTADA">Apartada</option>
                  <option value="VENDIDA">Vendida</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <h3 className="font-medium mb-3">Ubicación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Colonia *</label>
                <input
                  type="text"
                  required
                  value={formData.colonia}
                  onChange={(e) => setFormData({ ...formData, colonia: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ciudad *</label>
                <input
                  type="text"
                  required
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <input
                  type="text"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Código Postal</label>
                <input
                  type="text"
                  value={formData.codigoPostal}
                  onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Características */}
          <div>
            <h3 className="font-medium mb-3">Características</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Recámaras *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.recamaras}
                  onChange={(e) => setFormData({ ...formData, recamaras: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Baños *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.banos}
                  onChange={(e) => setFormData({ ...formData, banos: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estacionamientos</label>
                <input
                  type="number"
                  min="0"
                  value={formData.estacionamientos}
                  onChange={(e) => setFormData({ ...formData, estacionamientos: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">m² Construcción *</label>
                <input
                  type="number"
                  required
                  value={formData.metrosConstruccion}
                  onChange={(e) => setFormData({ ...formData, metrosConstruccion: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">m² Terreno</label>
                <input
                  type="number"
                  value={formData.metrosTerreno}
                  onChange={(e) => setFormData({ ...formData, metrosTerreno: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Créditos */}
          <div>
            <h3 className="font-medium mb-3">Acepta</h3>
            <div className="space-y-2">
              {[
                { key: 'aceptaContado', label: 'Contado' },
                { key: 'aceptaBancario', label: 'Crédito Bancario' },
                { key: 'aceptaInfonavit', label: 'Infonavit' },
                { key: 'aceptaFovissste', label: 'Fovissste' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                    className="mr-2"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
