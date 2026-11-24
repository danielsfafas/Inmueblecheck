import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Páginas públicas
import HomePage from './pages/public/HomePage';
import PropiedadesPage from './pages/public/PropiedadesPage';
import PropiedadDetallePage from './pages/public/PropiedadDetallePage';
import PrivacidadPage from './pages/public/PrivacidadPage';

// Páginas de autenticación
import LoginPage from './pages/auth/LoginPage';

// Páginas del panel
import DashboardLayout from './components/layouts/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProspectosPage from './pages/dashboard/ProspectosPage';
import ProspectoDetallePage from './pages/dashboard/ProspectoDetallePage';
import PropiedadesAdminPage from './pages/dashboard/PropiedadesAdminPage';
import RecordatoriosPage from './pages/dashboard/RecordatoriosPage';
import ReportesPage from './pages/dashboard/ReportesPage';
import ConfiguracionPage from './pages/dashboard/ConfiguracionPage';
import BotSimuladorPage from './pages/dashboard/BotSimuladorPage';
import MiWhatsAppPage from './pages/dashboard/MiWhatsAppPage';
import ConversacionesPage from './pages/dashboard/ConversacionesPage';
import ConversacionDetallePage from './pages/dashboard/ConversacionDetallePage';
import CitasPage from './pages/dashboard/CitasPage';
import HorariosPage from './pages/dashboard/HorariosPage';

// Links antiguos (/propiedades/:id y /propiedad/:id) → ficha pública con slug.
// Antes se navegaba al texto literal ":id" y la ficha no abría.
function LegacyPropiedadRedirect() {
  const { id } = useParams();
  return <Navigate to={`/i/casas-hidalgo/propiedades/${encodeURIComponent(id)}`} replace />;
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Navigate to="/i/casas-hidalgo/propiedades" />} />
      <Route path="/i/:slug/propiedades" element={<PropiedadesPage />} />
      <Route path="/i/:slug/propiedades/:id" element={<PropiedadDetallePage />} />
      <Route path="/privacidad" element={<PrivacidadPage />} />
      
      {/* Rutas legacy (redirigir a casas-hidalgo) */}
      <Route path="/propiedades" element={<Navigate to="/i/casas-hidalgo/propiedades" />} />
      <Route path="/propiedades/:id" element={<LegacyPropiedadRedirect />} />
      <Route path="/propiedad/:id" element={<LegacyPropiedadRedirect />} />
      
      {/* Autenticación */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Panel de administración */}
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="prospectos" element={<ProspectosPage />} />
        <Route path="prospectos/:id" element={<ProspectoDetallePage />} />
        <Route path="propiedades" element={<PropiedadesAdminPage />} />
        <Route path="conversaciones" element={<ConversacionesPage />} />
        <Route path="conversaciones/:id" element={<ConversacionDetallePage />} />
        <Route path="citas" element={<CitasPage />} />
        <Route path="horarios" element={<HorariosPage />} />
        <Route path="recordatorios" element={<RecordatoriosPage />} />
        <Route path="mi-whatsapp" element={<MiWhatsAppPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="bot-simulador" element={<BotSimuladorPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
