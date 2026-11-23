import { useState } from 'react';
import { Bot, Send, User } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function BotSimuladorPage() {
  const [mensajes, setMensajes] = useState([]);
  const [inputMensaje, setInputMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [prospectoSimulado] = useState({
    nombre: 'Usuario de Prueba',
    telefono: '7751234567',
  });

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!inputMensaje.trim() || cargando) return;

    const mensajeUsuario = {
      id: mensajes.length + 1,
      esBot: false,
      contenido: inputMensaje,
      timestamp: new Date(),
    };

    setMensajes((prev) => [...prev, mensajeUsuario]);
    const mensajeEnviado = inputMensaje;
    setInputMensaje('');
    setCargando(true);

    try {
      // Llamar al endpoint real del backend
      const { data } = await api.post('/bot-simulator/mensaje', {
        mensaje: mensajeEnviado,
      });

      // El backend retorna un array 'respuestas' que puede contener múltiples mensajes
      // (ej. mensaje de bienvenida + respuesta en primera interacción)
      const nuevosmensajes = (data.respuestas || [data.respuesta]).map((contenido, index) => ({
        id: mensajes.length + index + 1,
        esBot: true,
        contenido,
        timestamp: new Date(),
        pasadoAHumano: data.pasadoAHumano,
        dadoDeBaja: data.dadoDeBaja,
      }));

      setMensajes((prev) => [...prev, ...nuevosMensajes]);

      if (data.pasadoAHumano) {
        toast.success('✅ Pase a ejecutivo registrado en el sistema');
      }

      if (data.dadoDeBaja) {
        toast.info('ℹ️ Baja registrada en el sistema');
      }
    } catch (error) {
      console.error('Error al procesar el mensaje:', error);
      toast.error('Error al procesar el mensaje');
    } finally {
      setCargando(false);
    }
  };

  const ejemplosComandos = [
    { texto: 'Quiero ver casas disponibles', descripcion: 'Consulta general' },
    { texto: '¿Aceptan crédito Infonavit?', descripcion: 'Consulta créditos' },
    { texto: 'AGENTE', descripcion: 'Pase a humano' },
    { texto: 'BAJA', descripcion: 'Solicitud de baja' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Simulador de Bot de WhatsApp</h1>
        <p className="mt-2 text-gray-600">
          Prueba las respuestas del bot antes de que interactúe con prospectos reales
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-4 border-b bg-green-600 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full">
                  <Bot className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold">Bot de Casas Hidalgo</h2>
                  <p className="text-sm text-green-100">Simulación de WhatsApp</p>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-green-50">
              {mensajes.map((mensaje) => (
                <div
                  key={mensaje.id}
                  className={`flex ${mensaje.esBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[80%]`}>
                    {mensaje.esBot && (
                      <div className="flex-shrink-0 p-2 bg-white rounded-full shadow">
                        <Bot className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                    <div>
                      <div
                        className={`p-3 rounded-lg ${
                          mensaje.esBot
                            ? 'bg-white text-gray-900 shadow'
                            : 'bg-green-600 text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{mensaje.contenido}</p>
                        {mensaje.pasadoAHumano && (
                          <div className="mt-2 p-2 bg-green-100 text-green-800 rounded text-sm">
                            🔔 Pase a ejecutivo registrado
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {mensaje.timestamp.toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!mensaje.esBot && (
                      <div className="flex-shrink-0 p-2 bg-green-600 rounded-full shadow">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {cargando && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg shadow">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={enviarMensaje} className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMensaje}
                  onChange={(e) => setInputMensaje(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={cargando}
                />
                <button
                  type="submit"
                  disabled={cargando || !inputMensaje.trim()}
                  className="px-4 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Info del prospecto simulado */}
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="mb-3 font-semibold text-gray-900">Prospecto Simulado</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Nombre:</span>
                <p className="text-gray-900">{prospectoSimulado.nombre}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Teléfono:</span>
                <p className="text-gray-900">{prospectoSimulado.telefono}</p>
              </div>
            </div>
          </div>

          {/* Ejemplos */}
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="mb-3 font-semibold text-gray-900">Ejemplos de Mensajes</h3>
            <div className="space-y-2">
              {ejemplosComandos.map((ejemplo, index) => (
                <button
                  key={index}
                  onClick={() => setInputMensaje(ejemplo.texto)}
                  className="w-full p-3 text-left transition-colors border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <p className="text-sm font-medium text-gray-900">{ejemplo.texto}</p>
                  <p className="text-xs text-gray-500">{ejemplo.descripcion}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Ayuda */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="mb-2 font-semibold text-blue-900">ℹ️ Funcionalidades</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Responde consultas automáticamente</li>
              <li>• Detecta comandos AGENTE y BAJA</li>
              <li>• Pase a ejecutivo registrado</li>
              <li>• Simulación sin afectar datos reales</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
