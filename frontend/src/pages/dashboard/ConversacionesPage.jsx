import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ConversacionesPage() {
  const navigate = useNavigate();
  const socket = useSocket();
  
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    cargarConversaciones();
  }, [statusFilter]);

  useEffect(() => {
    if (!socket) return;

    socket.on('conversacion-actualizada', handleConversacionActualizada);
    socket.on('mensaje-nuevo', handleMensajeNuevo);

    return () => {
      socket.off('conversacion-actualizada', handleConversacionActualizada);
      socket.off('mensaje-nuevo', handleMensajeNuevo);
    };
  }, [socket]);

  const cargarConversaciones = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;

      const { data } = await api.get('/conversaciones', { params });
      setConversaciones(data);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversacionActualizada = (payload) => {
    // Recargar conversaciones cuando hay cambio de status
    cargarConversaciones();
  };

  const handleMensajeNuevo = (payload) => {
    // Actualizar conversación específica con nuevo mensaje
    cargarConversaciones();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    cargarConversaciones();
  };

  const getStatusBadge = (status, botPausadoHasta) => {
    if (status === 'bot_activo') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Bot Activo
        </span>
      );
    } else if (status === 'pausado') {
      const tiempoRestante = botPausadoHasta
        ? formatDistanceToNow(new Date(botPausadoHasta), { locale: es })
        : '';
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pausado {tiempoRestante ? `(${tiempoRestante})` : ''}
        </span>
      );
    } else if (status === 'pasado_humano') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Con Asesor
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const fechaRelativa = (conv) =>
    formatDistanceToNow(new Date(conv.ultimoMensaje ? conv.ultimoMensaje.fecha : conv.createdAt), {
      addSuffix: true,
      locale: es,
    });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Conversaciones</h1>
        <p className="mt-2 text-sm text-gray-700">
          Gestiona las conversaciones de WhatsApp con tus prospectos
        </p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <label htmlFor="search" className="sr-only">
            Buscar por teléfono o nombre
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="search"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
              placeholder="Buscar por teléfono o nombre..."
            />
          </div>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field sm:w-56"
          aria-label="Filtrar por estado"
        >
          <option value="all">Todos los estados</option>
          <option value="bot_activo">Bot Activo</option>
          <option value="pausado">Pausado</option>
          <option value="pasado_humano">Con Asesor</option>
        </select>
      </div>

      <div className="mt-6">
        {conversaciones.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay conversaciones</h3>
            <p className="mt-1 text-sm text-gray-500">
              Las conversaciones de WhatsApp aparecerán aquí
            </p>
          </div>
        ) : (
          <>
            {/* Móvil y tablet: lista tipo bandeja de entrada */}
            <ul className="lg:hidden divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow ring-1 ring-black/5">
              {conversaciones.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/conversaciones/${conv.id}`)}
                    className="block w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">
                        {conv.prospectoTelefono}
                      </span>
                      <span className="shrink-0 text-xs text-gray-500">{fechaRelativa(conv)}</span>
                    </div>
                    {conv.prospectoNombre && (
                      <p className="text-sm text-gray-700 truncate">{conv.prospectoNombre}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2 break-words">
                      {conv.ultimoMensaje ? (
                        <>
                          {conv.ultimoMensaje.esBot && <span className="text-gray-400">Bot: </span>}
                          {conv.ultimoMensaje.contenido}
                        </>
                      ) : (
                        <span className="italic text-gray-400">Sin mensajes</span>
                      )}
                    </p>
                    <div className="mt-2">{getStatusBadge(conv.status, conv.botPausadoHasta)}</div>
                  </button>
                </li>
              ))}
            </ul>

            {/* Escritorio: tabla */}
            <div className="hidden lg:block overflow-hidden shadow ring-1 ring-black/5 rounded-lg">
              <table className="w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Teléfono
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Nombre
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Último Mensaje
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th className="hidden xl:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Fecha
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {conversaciones.map((conv) => (
                    <tr
                      key={conv.id}
                      onClick={() => navigate(`/admin/conversaciones/${conv.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 tabular-nums sm:pl-6">
                        {conv.prospectoTelefono}
                      </td>
                      <td className="max-w-[12rem] px-3 py-4 text-sm text-gray-900 truncate">
                        {conv.prospectoNombre}
                      </td>
                      <td className="w-full max-w-0 px-3 py-4 text-sm text-gray-500 truncate">
                        {conv.ultimoMensaje ? (
                          <span>
                            {conv.ultimoMensaje.esBot && (
                              <span className="text-xs text-gray-400 mr-1">Bot:</span>
                            )}
                            {conv.ultimoMensaje.contenido}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Sin mensajes</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getStatusBadge(conv.status, conv.botPausadoHasta)}
                      </td>
                      <td className="hidden xl:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {fechaRelativa(conv)}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/conversaciones/${conv.id}`);
                          }}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
