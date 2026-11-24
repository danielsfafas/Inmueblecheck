import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { mediaUrl } from '../../utils/mediaUrl';
import {
  Building2,
  Bed,
  Bath,
  Car,
  MapPin,
  Ruler,
  MessageCircle,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PublicHeader from '../../components/PublicHeader';

export default function PropiedadDetallePage() {
  const { slug, id } = useParams();
  const [propiedad, setPropiedad] = useState(null);
  const [loading, setLoading] = useState(true);

  // Slug por defecto en desarrollo
  const slugInmobiliaria = slug || 'casas-hidalgo';

  useEffect(() => {
    cargarPropiedad();
  }, [slugInmobiliaria, id]);

  const cargarPropiedad = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/public/${slugInmobiliaria}/propiedades/${id}`);
      setPropiedad(data);
    } catch (error) {
      toast.error('Error al cargar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = async () => {
    if (!propiedad) return;

    try {
      await api.post(`/public/${slugInmobiliaria}/propiedades/${id}/whatsapp-click`);
      
      const mensaje = encodeURIComponent(
        `Hola, me interesa la propiedad: ${propiedad.titulo} (${formatCurrency(propiedad.precio)})`
      );
      const url = `https://wa.me/${propiedad.inmobiliaria.telefono.replace(/\D/g, '')}?text=${mensaje}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error al registrar clic:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!propiedad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Propiedad no encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader backTo={`/i/${slugInmobiliaria}/propiedades`} />

      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2">
            {/* Galería */}
            <div className="mb-6 overflow-hidden bg-gray-200 rounded-lg aspect-video">
              {propiedad.fotos && propiedad.fotos[0] ? (
                <img
                  src={mediaUrl(propiedad.fotos[0])}
                  alt={propiedad.titulo}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Building2 className="w-24 h-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Título y ubicación */}
            <div className="mb-6">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">{propiedad.titulo}</h1>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2" />
                {propiedad.colonia}, {propiedad.ciudad}, {propiedad.estado}
              </div>
            </div>

            {/* Características principales */}
            <div className="grid grid-cols-2 gap-4 p-6 mb-6 bg-white rounded-lg shadow sm:grid-cols-4">
              {propiedad.recamaras > 0 && (
                <div className="text-center">
                  <Bed className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                  <p className="text-sm text-gray-600">Recámaras</p>
                  <p className="font-semibold">{propiedad.recamaras}</p>
                </div>
              )}
              {propiedad.banos > 0 && (
                <div className="text-center">
                  <Bath className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                  <p className="text-sm text-gray-600">Baños</p>
                  <p className="font-semibold">{propiedad.banos}</p>
                </div>
              )}
              {propiedad.estacionamientos > 0 && (
                <div className="text-center">
                  <Car className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                  <p className="text-sm text-gray-600">Estacionamiento</p>
                  <p className="font-semibold">{propiedad.estacionamientos}</p>
                </div>
              )}
              <div className="text-center">
                <Ruler className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                <p className="text-sm text-gray-600">Construcción</p>
                <p className="font-semibold">{propiedad.metrosConstruccion} m²</p>
              </div>
            </div>

            {/* Descripción */}
            <div className="p-6 mb-6 bg-white rounded-lg shadow">
              <h2 className="mb-4 text-xl font-bold text-gray-900">Descripción</h2>
              <p className="text-gray-700 whitespace-pre-line">{propiedad.descripcion}</p>
            </div>

            {/* Videos */}
            {propiedad.videos && propiedad.videos.length > 0 && (
              <div className="p-6 mb-6 bg-white rounded-lg shadow">
                <h2 className="mb-4 text-xl font-bold text-gray-900">Videos</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {propiedad.videos.map((video) => (
                    <div key={video.id} className="overflow-hidden rounded-lg">
                      {video.tipo === 'YOUTUBE' ? (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                          loading="lazy"
                          className="w-full aspect-video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          controls
                          preload="metadata"
                          playsInline
                          className="w-full rounded-lg"
                          src={mediaUrl(video.archivoUrl)}
                        >
                          Tu navegador no soporta video HTML5.
                        </video>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opciones de pago */}
            {propiedad.tipo === 'VENTA' && (
              <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="mb-4 text-xl font-bold text-gray-900">Opciones de pago</h2>
                <div className="space-y-2">
                  {propiedad.aceptaContado && (
                    <div className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Pago de contado
                    </div>
                  )}
                  {propiedad.aceptaBancario && (
                    <div className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Crédito bancario
                    </div>
                  )}
                  {propiedad.aceptaInfonavit && (
                    <div className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Crédito Infonavit
                    </div>
                  )}
                  {propiedad.aceptaFovissste && (
                    <div className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Crédito Fovissste
                    </div>
                  )}
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  {propiedad.tipo === 'VENTA' && (propiedad.aceptaBancario || propiedad.aceptaInfonavit || propiedad.aceptaFovissste) && (
                    'El precio final puede variar según gastos notariales y de crédito. Consulte con nuestros asesores.'
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky p-6 bg-white rounded-lg shadow top-4">
              <div className="mb-6">
                <p className="mb-1 text-sm text-gray-600">Precio</p>
                <p className="text-3xl font-bold text-primary-600">
                  {formatCurrency(propiedad.precio)}
                  {propiedad.tipo === 'RENTA' && <span className="text-lg font-normal text-gray-600">/mes</span>}
                </p>
              </div>

              <button
                onClick={handleWhatsAppClick}
                className="flex items-center justify-center w-full px-6 py-3 mb-4 font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Contactar por WhatsApp
              </button>

              <div className="pt-4 border-t">
                <p className="mb-2 text-sm font-medium text-gray-900">Contacto</p>
                <p className="mb-1 text-sm text-gray-600">{propiedad.inmobiliaria.nombre}</p>
                <p className="mb-1 text-sm text-gray-600">{propiedad.inmobiliaria.telefono}</p>
                {propiedad.inmobiliaria.horario && (
                  <p className="text-xs text-gray-500">{propiedad.inmobiliaria.horario}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
