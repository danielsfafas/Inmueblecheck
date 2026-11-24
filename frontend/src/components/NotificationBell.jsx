import { useState, useEffect, useRef } from 'react';
import { Bell, CalendarPlus, CalendarX, Headphones, MessageCircle, Megaphone } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

// placement: 'header' (barra superior móvil) o 'sidebar' (pie de la barra lateral de escritorio)
// eslint-disable-next-line react/prop-types
export default function NotificationBell({ placement = 'header' }) {
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

    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
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

  const TIPO_ICONOS = {
    AGENTE_SOLICITADO: { Icon: Headphones, className: 'bg-amber-100 text-amber-700' },
    CITA_CREADA: { Icon: CalendarPlus, className: 'bg-green-100 text-green-700' },
    CITA_CANCELADA: { Icon: CalendarX, className: 'bg-red-100 text-red-700' },
    MENSAJE_NUEVO: { Icon: MessageCircle, className: 'bg-primary-100 text-primary-700' },
  };

  const renderTipoIcon = (tipo) => {
    const { Icon, className } = TIPO_ICONOS[tipo] || { Icon: Megaphone, className: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${className}`}>
        <Icon className="h-4 w-4" />
      </span>
    );
  };

  // En el header móvil el panel ocupa el ancho de la pantalla bajo la barra;
  // en la barra lateral de escritorio se abre hacia arriba y a la derecha para no salir del viewport.
  const panelPosition =
    placement === 'sidebar'
      ? 'absolute bottom-full left-0 mb-2 w-96 max-h-[calc(100vh-6rem)]'
      : 'fixed inset-x-2 top-[4.25rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 max-h-[calc(100dvh-5rem)]';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg ${
          placement === 'sidebar' ? 'p-2' : 'tap-target'
        }`}
        aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-6 w-6" />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white tabular-nums">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`${panelPosition} z-50 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl`}
          role="dialog"
          aria-label="Notificaciones"
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 shrink-0">
            <h3 className="text-base font-semibold text-gray-900">Notificaciones</h3>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={handleMarcarLeidas}
                className="-mr-2 min-h-[44px] rounded-lg px-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-800"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                    className={`block px-4 py-3 hover:bg-gray-50 ${
                      !notif.leida ? 'bg-primary-50/60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {renderTipoIcon(notif.tipo)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notif.titulo}</p>
                        <p className="text-sm text-gray-600 mt-0.5 break-words">{notif.mensaje}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                      {!notif.leida && (
                        <span className="mt-1.5 flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full" aria-label="Sin leer"></span>
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
