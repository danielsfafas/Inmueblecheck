import { Link } from 'react-router-dom';
import { Building2, Search, Heart, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">InmuebleCheck</span>
            </div>
            <nav className="hidden space-x-8 md:flex">
              <Link to="/propiedades" className="text-gray-700 hover:text-primary-600">
                Propiedades
              </Link>
              <Link to="/login" className="text-gray-700 hover:text-primary-600">
                Iniciar sesión
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Encuentra tu hogar ideal
              <span className="block text-primary-600">en Hidalgo</span>
            </h1>
            <p className="max-w-2xl mx-auto mt-6 text-xl text-gray-600">
              Casas y departamentos en Tepeapulco y Ciudad Sahagún. Con múltiples opciones de financiamiento.
            </p>
            <div className="mt-10">
              <Link
                to="/propiedades"
                className="inline-flex items-center px-8 py-3 text-lg font-medium text-white transition-colors bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Ver propiedades disponibles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="py-16">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <Search className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Búsqueda fácil</h3>
              <p className="text-gray-600">
                Filtra por zona, precio, tipo de propiedad y forma de pago
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <Heart className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Múltiples opciones</h3>
              <p className="text-gray-600">
                Contado, crédito bancario, Infonavit y Fovissste
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <Shield className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Confianza y seguridad</h3>
              <p className="text-gray-600">
                Propiedades verificadas y asesoría profesional
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 mt-16 border-t bg-gray-50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">© 2026 InmuebleCheck - Powered by DanySolutions</p>
            <div className="space-x-4">
              <Link to="/privacidad" className="hover:text-primary-600">
                Aviso de privacidad
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
