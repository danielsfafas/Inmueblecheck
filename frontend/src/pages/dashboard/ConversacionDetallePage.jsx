import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { format } from 'date-fns';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/conversaciones')}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {conversacion.prospecto.nombre}
              </h1>
              <p className="text-sm text-gray-500">{conversacion.prospecto.telefono}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversacion.status === 'bot_activo' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Bot Activo
              </span>
            )}
            {conversacion.status === 'pausado' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                Bot Pausado
              </span>
            )}
            {conversacion.status === 'pasado_humano' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Con Asesor
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                    className={`max-w-md px-4 py-2 rounded-lg ${
                      esBot
                        ? 'bg-white border border-gray-200 text-gray-800'
                        : esAsesor
                        ? 'bg-indigo-100 text-gray-900'
                        : 'bg-indigo-600 text-white'
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
                    <div className="whitespace-pre-wrap break-words">{msg.contenido}</div>
                    <div
                      className={`text-xs mt-1 ${
                        esCliente ? 'text-indigo-100' : 'text-gray-500'
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

          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleEnviarMensaje} className="flex gap-2">
              <input
                type="text"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe un mensaje como asesor..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!mensaje.trim() || sending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>

        <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Información del Prospecto</h2>

          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nombre</dt>
              <dd className="mt-1 text-sm text-gray-900">{conversacion.prospecto.nombre}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
              <dd className="mt-1 text-sm text-gray-900">{conversacion.prospecto.telefono}</dd>
            </div>
            {conversacion.prospecto.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{conversacion.prospecto.email}</dd>
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
              className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Ver Prospecto Completo
            </Link>

            {conversacion.status === 'bot_activo' ? (
              <button
                onClick={handlePausarBot}
                className="block w-full text-center px-4 py-2 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
              >
                Pausar Bot
              </button>
            ) : (
              <button
                onClick={handleReactivarBot}
                className="block w-full text-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
              >
                Reactivar Bot
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
