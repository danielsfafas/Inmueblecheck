import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="px-4 py-8 mx-auto max-w-4xl sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center min-h-[44px] mb-4 text-gray-700 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver al inicio
        </Link>

        <div className="p-8 bg-white rounded-lg shadow">
          <h1 className="mb-6 text-3xl font-bold text-gray-900">Aviso de Privacidad</h1>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Responsable del tratamiento</h2>
              <p>
                [Nombre de la inmobiliaria], con domicilio en [dirección completa], es responsable del tratamiento
                de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión
                de los Particulares (LFPDPPP).
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Datos personales que recabamos</h2>
              <p className="mb-2">Recabamos los siguientes datos personales:</p>
              <ul className="pl-5 space-y-1 list-disc">
                <li>Nombre completo</li>
                <li>Teléfono</li>
                <li>Correo electrónico</li>
                <li>Datos patrimoniales y financieros (presupuesto, forma de pago, crédito preaprobado)</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">3. Finalidades del tratamiento</h2>
              <p className="mb-2">Utilizamos sus datos personales para:</p>
              <ul className="pl-5 space-y-1 list-disc">
                <li>Atender sus solicitudes de información sobre propiedades</li>
                <li>Agendar visitas y dar seguimiento a su interés</li>
                <li>Evaluar su capacidad de compra para ofrecerle opciones adecuadas</li>
                <li>Enviarle información sobre nuevas propiedades (solo con su consentimiento)</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">4. Consentimiento</h2>
              <p>
                El envío de sus datos personales a través de nuestros formularios constituye su consentimiento
                para el tratamiento de los mismos. Para datos financieros y patrimoniales, requerimos su
                consentimiento expreso mediante casilla de aceptación.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">5. Derechos ARCO</h2>
              <p>
                Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos
                personales. Para ejercer estos derechos, puede contactarnos en [email de privacidad].
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">6. Uso de cookies</h2>
              <p>
                Nuestro sitio web utiliza cookies para mejorar su experiencia de navegación y analizar el tráfico.
                Puede configurar su navegador para rechazar las cookies, aunque esto puede limitar algunas
                funcionalidades del sitio.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">7. Contacto</h2>
              <p>
                Para cualquier duda sobre este aviso de privacidad, puede contactarnos en:
              </p>
              <ul className="mt-2 space-y-1">
                <li>Correo: [email de privacidad]</li>
                <li>Teléfono: [teléfono]</li>
                <li>Domicilio: [dirección completa]</li>
              </ul>
            </section>

            <section>
              <p className="text-sm text-gray-600">
                Última actualización: Noviembre 2026 | Versión 1.0
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
