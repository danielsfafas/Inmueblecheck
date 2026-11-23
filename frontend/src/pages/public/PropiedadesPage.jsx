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
  });

  useEffect(() => {
    cargarPropiedades();
  }, []);

  const cargarPropiedades = async () => {
    try {
      setLoading(true);
      // Filtrar parámetros vacíos
      const params = Object.fromEntries(
        Object.entries(filtros).filter(([_, value]) => value !== '')
      );
      
      const { data } = await api.get('/public/propiedades', { params });
      setPropiedades(data.propiedades || []);
    } catch (error) {
      console.error('Error al cargar propiedades:', error);
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
                className="overflow-hidden transition-all bg-white rounded-xl shadow-md hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="relative h-56 bg-gradient-to-br from-primary-100 to-primary-200">
                  {propiedad.fotos && propiedad.fotos[0] ? (
                    <img
                      src={propiedad.fotos[0]}
                      alt={propiedad.titulo}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Building2 className="w-20 h-20 text-primary-400 mb-2" />
                      <span className="text-primary-600 font-medium">Sin imagen</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1.5 text-sm font-semibold text-white rounded-lg shadow-lg ${
                      propiedad.tipo === 'VENTA' ? 'bg-green-600' : 'bg-blue-600'
                    }`}>
                      {propiedad.tipo === 'VENTA' ? 'En Venta' : 'En Renta'}
                    </span>
                  </div>
                  {/* Badges de crédito aceptado */}
                  {(propiedad.aceptaBancario || propiedad.aceptaInfonavit || propiedad.aceptaFovissste) && (
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                      {propiedad.aceptaBancario && (
                        <span className="px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded shadow">
                          Bancario
                        </span>
                      )}
                      {propiedad.aceptaInfonavit && (
                        <span className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded shadow">
                          Infonavit
                        </span>
                      )}
                      {propiedad.aceptaFovissste && (
                        <span className="px-2 py-1 text-xs font-medium text-white bg-orange-600 rounded shadow">
                          Fovissste
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="mb-2 text-xl font-bold text-gray-900 line-clamp-2 min-h-[3.5rem]">
                    {propiedad.titulo}
                  </h3>

                  <div className="flex items-center mb-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 text-primary-500" />
                    <span className="line-clamp-1">{propiedad.colonia}, {propiedad.ciudad}</span>
                  </div>

                  <div className="flex items-center mb-4 space-x-5 text-gray-700">
                    {propiedad.recamaras > 0 && (
                      <div className="flex items-center font-medium">
                        <Bed className="w-5 h-5 mr-1.5 text-primary-600" />
                        <span>{propiedad.recamaras}</span>
                      </div>
                    )}
                    {propiedad.banos > 0 && (
                      <div className="flex items-center font-medium">
                        <Bath className="w-5 h-5 mr-1.5 text-primary-600" />
                        <span>{propiedad.banos}</span>
                      </div>
                    )}
                    {propiedad.estacionamientos > 0 && (
                      <div className="flex items-center font-medium">
                        <Car className="w-5 h-5 mr-1.5 text-primary-600" />
                        <span>{propiedad.estacionamientos}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t-2 border-gray-100">
                    <p className="text-3xl font-extrabold text-primary-600">
                      {formatCurrency(propiedad.precio)}
                      {propiedad.tipo === 'RENTA' && <span className="text-lg font-medium text-gray-500">/mes</span>}
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
