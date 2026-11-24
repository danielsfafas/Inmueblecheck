import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { format } from 'date-fns';
import { ChevronLeft, Info, X } from 'lucide-react';
import { es } from 'date-fns/locale';

export default function ConversacionDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const messagesEndRef = useRef(null);
  
  const [conversacion, setConversacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [infoAbierta, setInfoAbierta] = useState(false);

  useEffect(() => {
    cargarConversacion();
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join-conversacion', id);
    socket.on('mensaje-nuevo', handleMensajeNuevo);

    return () => {
      socket.emit('leave-conversacion', id);
      socket.off('mensaje-nuevo', handleMensajeNuevo);
    };
  }, [socket, id]);

  useEffect(() => {
    scrollToBottom();
  }, [conversacion?.mensajes]);

  const cargarConversacion = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/conversaciones/${id}`);
      setConversacion(data);
    } catch (error) {
      console.error('Error cargando conversación:', error);
      if (error.response?.status === 404) {
        navigate('/admin/conversaciones');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMensajeNuevo = (payload) => {
    if (payload.conversacionId === id) {
      setConversacion((prev) => ({
        ...prev,
        mensajes: [...(prev?.mensajes || []), payload.mensaje],
      }));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReactivarBot = async () => {
    if (!confirm('¿Reactivar el bot para esta conversación?')) return;

    try {
      await api.post(`/conversaciones/${id}/reactivar-bot`);
      await cargarConversacion();
      alert('Bot reactivado exitosamente');
    } catch (error) {
      console.error('Error reactivando bot:', error);
      alert('Error al reactivar bot');
    }
  };

  const handlePausarBot = async () => {
    const horas = prompt('¿Cuántas horas pausar el bot? (default: 24)', '24');
    if (!horas) return;

    try {
      await api.post(`/conversaciones/${id}/pausar-bot`, {
        horas: parseInt(horas),
      });
      await cargarConversacion();
      alert(`Bot pausado por ${horas} horas`);
    } catch (error) {
      console.error('Error pausando bot:', error);
      alert('Error al pausar bot');
    }
  };

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!mensaje.trim() || sending) return;

    try {
      setSending(true);
      await api.post(`/conversaciones/${id}/enviar-mensaje`, {
        contenido: mensaje.trim(),
      });
      setMensaje('');
      await cargarConversacion();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!conversacion) {
    return (
      <div className="text-center py-12">
        <p>Conversación no encontrada</p>
      </div>
    );
  }

  const statusBadge = (
    <>
      {conversacion.status === 'bot_activo' && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
          Bot Activo
        </span>
      )}
      {conversacion.status === 'pausado' && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800 whitespace-nowrap">
          Bot Pausado
        </span>
      )}
      {conversacion.status === 'pasado_humano' && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
          Con Asesor
        </span>
      )}
    </>
  );

  const panelInfo = (
    <>
      <dl className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-gray-500">Nombre</dt>
          <dd className="mt-1 text-sm text-gray-900 break-words">{conversacion.prospecto.nombre}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
          <dd className="mt-1 text-sm text-gray-900 tabular-nums">{conversacion.prospecto.telefono}</dd>
        </div>
        {conversacion.prospecto.email && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900 break-all">{conversacion.prospecto.email}</dd>
          </div>
        )}
        {conversacion.prospecto.ejecutivo && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Asesor Asignado</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {conversacion.prospecto.ejecutivo.nombre}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 space-y-2">
        <Link
          to={`/admin/prospectos/${conversacion.prospectoId}`}
          className="flex w-full min-h-[44px] items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Ver Prospecto Completo
        </Link>

        {conversacion.status === 'bot_activo' ? (
          <button
            type="button"
            onClick={handlePausarBot}
            className="flex w-full min-h-[44px] items-center justify-center px-4 py-2 border border-yellow-300 rounded-lg shadow-sm text-sm font-medium text-yellow-800 bg-yellow-50 hover:bg-yellow-100"
          >
            Pausar Bot
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReactivarBot}
            className="flex w-full min-h-[44px] items-center justify-center px-4 py-2 border border-green-300 rounded-lg shadow-sm text-sm font-medium text-green-800 bg-green-50 hover:bg-green-100"
          >
            Reactivar Bot
          </button>
        )}
      </div>
    </>
  );

  return (
    // Alto fijo al viewport: el historial hace scroll propio y la caja de respuesta queda siempre visible.
    <div className="-mx-4 -my-6 h-[calc(100dvh-4rem)] sm:mx-0 sm:my-0 sm:h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-3rem)] flex flex-col overflow-hidden bg-white sm:rounded-lg sm:border sm:border-gray-200 sm:shadow-sm">
      <div className="bg-white border-b border-gray-200 px-2 py-2 sm:px-4 sm:py-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/admin/conversaciones')}
              className="tap-target text-gray-500 hover:text-gray-700 hover:bg-gray-100 shrink-0"
              aria-label="Volver a conversaciones"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                {conversacion.prospecto.nombre}
              </h1>
              <p className="text-sm text-gray-500 tabular-nums truncate">{conversacion.prospecto.telefono}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {statusBadge}
            <button
              type="button"
              onClick={() => setInfoAbierta(true)}
              className="lg:hidden tap-target text-gray-600 hover:bg-gray-100"
              aria-label="Ver datos del prospecto y control del bot"
              aria-expanded={infoAbierta}
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 bg-gray-50">
            {conversacion.mensajes.map((msg, idx) => {
              const esBot = msg.remitente === 'bot';
              const esAsesor = msg.remitente === 'asesor';
              const esCliente = !esBot && !esAsesor;

              return (
                <div
                  key={msg.id || idx}
                  className={`flex ${esBot || esAsesor ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-md px-3.5 py-2 rounded-2xl ${
                      esBot
                        ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-md'
                        : esAsesor
                        ? 'bg-primary-100 text-gray-900 rounded-tl-md'
                        : 'bg-primary-600 text-white rounded-tr-md'
                    }`}
                  >
                    {esBot && (
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        🤖 Bot
                      </div>
                    )}
                    {esAsesor && (
                      <div className="text-xs text-gray-700 mb-1 flex items-center gap-1">
                        👤 Asesor
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words text-[15px] sm:text-sm leading-relaxed">{msg.contenido}</div>
                    <div
                      className={`text-xs mt-1 ${
                        esCliente ? 'text-primary-100' : 'text-gray-500'
                      }`}
                    >
                      {format(new Date(msg.createdAt), "d MMM 'a las' HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-200 px-3 pt-3 pb-safe sm:p-4 shrink-0">
            <form onSubmit={handleEnviarMensaje} className="flex gap-2">
              <input
                type="text"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe un mensaje como asesor..."
                aria-label="Mensaje como asesor"
                enterKeyHint="send"
                className="input-field flex-1 min-w-0"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!mensaje.trim() || sending}
                className="inline-flex shrink-0 items-center min-h-[44px] px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>

        {/* Escritorio: panel lateral fijo */}
        <aside className="hidden lg:block w-80 shrink-0 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Información del Prospecto</h2>
          {panelInfo}
        </aside>

        {/* Móvil/tablet: el mismo panel como hoja sobre el chat */}
        {infoAbierta && (
          <div className="lg:hidden absolute inset-0 z-20 flex">
            <button
              type="button"
              className="flex-1 bg-gray-900/40"
              aria-label="Cerrar datos del prospecto"
              onClick={() => setInfoAbierta(false)}
            />
            <aside className="w-full max-w-sm bg-white border-l border-gray-200 p-5 overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-4 -mt-1">
                <h2 className="text-lg font-medium text-gray-900">Información del Prospecto</h2>
                <button
                  type="button"
                  onClick={() => setInfoAbierta(false)}
                  className="tap-target -mr-3 text-gray-500 hover:bg-gray-100"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {panelInfo}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
