import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { Building2, Bed, Bath, Car, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PropiedadesPage() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    tipo: '',
    zona: '',
    precioMin: '',
    precioMax: '',
    recamaras: '',
    formaPago: '',
  });

  // Hardcoded inmobiliaria ID para demo
  const INMOBILIARIA_ID = 'demo-inmobiliaria-id';

  useEffect(() => {
    cargarPropiedades();
  }, []);

  const cargarPropiedades = async () => {
    try {
      setLoading(true);
      const params = {
        inmobiliariaId: INMOBILIARIA_ID,
        ...filtros,
      };
      
      const { data } = await api.get('/public/propiedades', { params });
      setPropiedades(data.propiedades);
    } catch (error) {
      toast.error('Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    cargarPropiedades();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Building2 className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">InmuebleCheck</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Propiedades disponibles</h1>

        {/* Filtros */}
        <form onSubmit={handleSearch} className="p-6 mb-8 bg-white rounded-lg shadow">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Tipo</option>
              <option value="VENTA">Venta</option>
              <option value="RENTA">Renta</option>
            </select>

            <input
              type="text"
              placeholder="Zona/Colonia"
              value={filtros.zona}
              onChange={(e) => setFiltros({ ...filtros, zona: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />

            <input
              type="number"
              placeholder="Precio mín."
              value={filtros.precioMin}
              onChange={(e) => setFiltros({ ...filtros, precioMin: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />

            <input
              type="number"
              placeholder="Precio máx."
              value={filtros.precioMax}
              onChange={(e) => setFiltros({ ...filtros, precioMax: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />

            <select
              value={filtros.recamaras}
              onChange={(e) => setFiltros({ ...filtros, recamaras: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Recámaras</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>

            <button
              type="submit"
              className="flex items-center justify-center px-4 py-2 font-medium text-white transition-colors bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </button>
          </div>
        </form>

        {/* Lista de propiedades */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando propiedades...</p>
          </div>
        ) : propiedades.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg">
            <p className="text-gray-600">No se encontraron propiedades con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {propiedades.map((propiedad) => (
              <Link
                key={propiedad.id}
                to={`/propiedades/${propiedad.id}`}
                className="overflow-hidden transition-shadow bg-white rounded-lg shadow hover:shadow-lg"
              >
                <div className="relative h-48 bg-gray-200">
                  {propiedad.fotos && propiedad.fotos[0] ? (
                    <img
                      src={propiedad.fotos[0]}
                      alt={propiedad.titulo}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Building2 className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-3 py-1 text-sm font-medium text-white rounded-full ${
                      propiedad.tipo === 'VENTA' ? 'bg-green-600' : 'bg-blue-600'
                    }`}>
                      {propiedad.tipo === 'VENTA' ? 'Venta' : 'Renta'}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 line-clamp-2">
                    {propiedad.titulo}
                  </h3>

                  <div className="flex items-center mb-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-1" />
                    {propiedad.colonia}, {propiedad.ciudad}
                  </div>

                  <div className="flex items-center mb-3 space-x-4 text-sm text-gray-600">
                    {propiedad.recamaras > 0 && (
                      <div className="flex items-center">
                        <Bed className="w-4 h-4 mr-1" />
                        {propiedad.recamaras}
                      </div>
                    )}
                    {propiedad.banos > 0 && (
                      <div className="flex items-center">
                        <Bath className="w-4 h-4 mr-1" />
                        {propiedad.banos}
                      </div>
                    )}
                    {propiedad.estacionamientos > 0 && (
                      <div className="flex items-center">
                        <Car className="w-4 h-4 mr-1" />
                        {propiedad.estacionamientos}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-2xl font-bold text-primary-600">
                      {formatCurrency(propiedad.precio)}
                      {propiedad.tipo === 'RENTA' && <span className="text-base font-normal text-gray-600">/mes</span>}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
