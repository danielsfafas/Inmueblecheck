import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Building2, 
  Bell, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bot,
  Smartphone,
  MessageCircle
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import NotificationBell from '../NotificationBell';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Prospectos', href: '/admin/prospectos', icon: Users },
  { name: 'Propiedades', href: '/admin/propiedades', icon: Building2 },
  { name: 'Conversaciones', href: '/admin/conversaciones', icon: MessageCircle },
  { name: 'Recordatorios', href: '/admin/recordatorios', icon: Bell },
  { name: 'Mi WhatsApp', href: '/admin/mi-whatsapp', icon: Smartphone },
  { name: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
  { name: 'Simulador Bot', href: '/admin/bot-simulador', icon: Bot },
  { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <span className="text-xl font-bold text-primary-600">InmuebleCheck</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <span className="text-xl font-bold text-primary-600">InmuebleCheck</span>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                <p className="text-xs text-gray-500">{user?.rol}</p>
              </div>
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64">
        {/* Header móvil */}
        <div className="sticky top-0 z-10 flex items-center h-16 bg-white border-b lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-semibold">InmuebleCheck</span>
        </div>

        {/* Contenido */}
        <main className="py-6">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
