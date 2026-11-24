import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogIn, ArrowLeft } from 'lucide-react';

export default function PublicHeader({ backTo = null, backLabel = null }) {
  const navigate = useNavigate();
  
  const handleAdminAccess = () => {
    // Check if user is already logged in (has token)
    const token = localStorage.getItem('token');
    
    if (token) {
      // Already logged in, go to admin
      navigate('/admin');
    } else {
      // Not logged in, go to login
      navigate('/login');
    }
  };

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="px-4 py-2 sm:py-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo or Back button */}
          {backTo ? (
            <Link 
              to={backTo} 
              className="-ml-2 flex items-center gap-2 min-h-[44px] px-2 rounded-lg text-gray-700 transition-colors hover:text-primary-600"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Volver a propiedades</span>
              <span className="text-sm font-medium sm:hidden">Volver</span>
            </Link>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">InmuebleCheck</span>
            </Link>
          )}

          {/* Right: Admin Access button - Discreet secondary style */}
          <button
            onClick={handleAdminAccess}
            className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium text-gray-500 transition-all bg-transparent border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 active:bg-gray-100"
            aria-label="Acceso administrador"
            title="Acceso administrador"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Administrador</span>
            <span className="md:hidden">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}
