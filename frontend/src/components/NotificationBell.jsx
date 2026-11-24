import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const socket = useSocket();
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('notificacion', handleNuevaNotificacion);

    return () => {
      socket.off('notificacion', handleNuevaNotificacion);
    };
  }, [socket]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const cargarNotificaciones = async () => {
    try {
      const { data } = await api.get('/notificaciones', { params: { limit: 10 } });
      setNotificaciones(data.notificaciones);
      setNoLeidas(data.noLeidas);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  const handleNuevaNotificacion = (notif) => {
    setNotificaciones((prev) => [notif, ...prev]);
    setNoLeidas((prev) => prev + 1);
  };

  const handleMarcarLeidas = async () => {
    try {
      await api.patch('/notificaciones/marcar-todas-leidas');
      setNoLeidas(0);
      setNotificaciones((prev) =>
        prev.map((n) => ({ ...n, leida: true }))
      );
    } catch (error) {
      console.error('Error marcando leídas:', error);
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'AGENTE_SOLICITADO':
        return '🔔';
      case 'CITA_CREADA':
        return '📅';
      case 'CITA_CANCELADA':
        return '❌';
      case 'MENSAJE_NUEVO':
        return '💬';
      default:
        return '📢';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full"
      >
        <Bell className="h-6 w-6" />
        {noLeidas > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
            {noLeidas > 0 && (
              <button
                onClick={handleMarcarLeidas}
                className="text-sm text-indigo-600 hover:text-indigo-900"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notificaciones.map((notif) => (
                  <Link
                    key={notif.id}
                    to={notif.enlace || '#'}
                    onClick={() => setOpen(false)}
                    className={`block p-4 hover:bg-gray-50 ${
                      !notif.leida ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getTipoIcon(notif.tipo)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notif.titulo}</p>
                        <p className="text-sm text-gray-600 mt-1">{notif.mensaje}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                      {!notif.leida && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
