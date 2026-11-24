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
  MessageCircle,
  CalendarDays,
  Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import NotificationBell from '../NotificationBell';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Prospectos', href: '/admin/prospectos', icon: Users },
  { name: 'Propiedades', href: '/admin/propiedades', icon: Building2 },
  { name: 'Conversaciones', href: '/admin/conversaciones', icon: MessageCircle },
  { name: 'Citas', href: '/admin/citas', icon: CalendarDays },
  { name: 'Horarios', href: '/admin/horarios', icon: Clock },
  { name: 'Recordatorios', href: '/admin/recordatorios', icon: Bell },
  { name: 'Mi WhatsApp', href: '/admin/mi-whatsapp', icon: Smartphone },
  { name: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
  { name: 'Simulador Bot', href: '/admin/bot-simulador', icon: Bot },
  { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

function NavItems({ onNavigate }) {
  return navigation.map((item) => (
    <NavLink
      key={item.name}
      to={item.href}
      end={item.href === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center min-h-[44px] lg:min-h-0 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-600'
            : 'text-gray-700 hover:bg-gray-50'
        }`
      }
    >
      <item.icon className="w-5 h-5 mr-3 shrink-0" />
      {item.name}
    </NavLink>
  ));
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Bloquear el scroll del fondo y cerrar con Escape mientras el menú está abierto.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setSidebarOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [sidebarOpen]);

  const userBlock = (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre}</p>
      <p className="text-xs text-gray-500 truncate">{user?.rol}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 pl-4 pr-2 border-b shrink-0">
              <span className="text-xl font-bold text-primary-600">InmuebleCheck</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="tap-target text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar menú"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
              <NavItems onNavigate={() => setSidebarOpen(false)} />
            </nav>
            <div className="flex items-center gap-2 p-3 border-t pb-safe shrink-0">
              {userBlock}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 min-h-[44px] px-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="w-5 h-5" />
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <span className="text-xl font-bold text-primary-600">InmuebleCheck</span>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            <NavItems />
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-1">
              {userBlock}
              <NotificationBell placement="sidebar" />
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-gray-400 rounded-lg hover:text-gray-600 hover:bg-gray-100"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
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
        <div className="sticky top-0 z-30 flex items-center h-16 gap-1 px-2 bg-white border-b lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="tap-target text-gray-600 hover:bg-gray-100"
            aria-label="Abrir menú"
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="flex-1 text-lg font-semibold truncate">InmuebleCheck</span>
          <NotificationBell placement="header" />
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
