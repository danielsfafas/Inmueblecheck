import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Calendar, MessageCircle, Phone, FileText, Bell, Mail } from 'lucide-react';
import { formatCurrency, formatDateTime, getCalificacionColor, getCalificacionLabel, getEtapaColor, getEtapaLabel } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ProspectoDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prospecto, setProspecto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalNota, setModalNota] = useState(false);
  const [nuevaNota, setNuevaNota] = useState({ titulo: '', descripcion: '' });
  const [modalRecordatorio, setModalRecordatorio] = useState(false);
  const [nuevoRecordatorio, setNuevoRecordatorio] = useState({ titulo: '', descripcion: '', fecha: '', hora: '' });
  const [modalLlamada, setModalLlamada] = useState(false);
  const [nuevaLlamada, setNuevaLlamada] = useState({ titulo: 'Llamada telefónica', descripcion: '' });

  useEffect(() => {
    cargarProspecto();
  }, [id]);

  const cargarProspecto = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/prospectos/${id}`);
      setProspecto(data);
    } catch (error) {
      toast.error('Error al cargar prospecto');
    } finally {
      setLoading(false);
    }
  };

  const actualizarEtapa = async (nuevaEtapa) => {
    try {
      await api.put(`/prospectos/${id}`, { etapa: nuevaEtapa });
      toast.success('Etapa actualizada');
      cargarProspecto();
    } catch (error) {
      toast.error('Error al actualizar etapa');
    }
  };

  const agregarNota = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/prospectos/${id}/actividades`, {
        tipo: 'NOTA',
        titulo: nuevaNota.titulo,
        descripcion: nuevaNota.descripcion,
      });
      toast.success('Nota agregada');
      setModalNota(false);
      setNuevaNota({ titulo: '', descripcion: '' });
      cargarProspecto();
    } catch (error) {
      toast.error('Error al agregar nota');
    }
  };

  const registrarLlamada = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/prospectos/${id}/actividades`, {
        tipo: 'LLAMADA',
        titulo: nuevaLlamada.titulo,
        descripcion: nuevaLlamada.descripcion,
      });
      toast.success('Llamada registrada');
      setModalLlamada(false);
      setNuevaLlamada({ titulo: 'Llamada telefónica', descripcion: '' });
      cargarProspecto();
    } catch (error) {
      toast.error('Error al registrar llamada');
    }
  };

  const agendarRecordatorio = async (e) => {
    e.preventDefault();
    try {
      const fechaCompleta = `${nuevoRecordatorio.fecha}T${nuevoRecordatorio.hora}:00.000Z`;
      await api.post(`/prospectos/${id}/recordatorios`, {
        titulo: nuevoRecordatorio.titulo,
        descripcion: nuevoRecordatorio.descripcion,
        fechaRecordatorio: fechaCompleta,
      });
      toast.success('Recordatorio agendado');
      setModalRecordatorio(false);
      setNuevoRecordatorio({ titulo: '', descripcion: '', fecha: '', hora: '' });
      cargarProspecto();
    } catch (error) {
      toast.error('Error al agendar recordatorio');
    }
  };

  const abrirWhatsApp = () => {
    const mensaje = encodeURIComponent(`Hola ${prospecto.nombre}, te contacto de Casas Hidalgo.`);
    const telefono = prospecto.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/52${telefono}?text=${mensaje}`, '_blank');
  };

  const abrirLlamada = () => {
    window.open(`tel:${prospecto.telefono}`);
  };

  if (loading || !prospecto) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin/prospectos')}
        className="flex items-center mb-6 text-gray-700 hover:text-primary-600"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver a prospectos
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Información principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{prospecto.nombre}</h1>
                <p className="text-gray-600">{prospecto.telefono}</p>
                {prospecto.email && <p className="text-gray-600">{prospecto.email}</p>}
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCalificacionColor(prospecto.calificacion)}`}>
                  {getCalificacionLabel(prospecto.calificacion)}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getEtapaColor(prospecto.etapa)}`}>
                  {getEtapaLabel(prospecto.etapa)}
                </span>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
              <button
                onClick={abrirLlamada}
                className="flex items-center justify-center px-4 py-3 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Phone className="w-4 h-4 mr-2" />
                Llamar
              </button>
              <button
                onClick={abrirWhatsApp}
                className="flex items-center justify-center px-4 py-3 font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </button>
              <button
                onClick={() => setModalRecordatorio(true)}
                className="flex items-center justify-center px-4 py-3 font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
              >
                <Bell className="w-4 h-4 mr-2" />
                Recordatorio
              </button>
              <button
                onClick={() => setModalLlamada(true)}
                className="flex items-center justify-center px-4 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Registrar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {prospecto.presupuesto && (
                <div>
                  <p className="text-sm text-gray-600">Presupuesto</p>
                  <p className="font-semibold">{formatCurrency(prospecto.presupuesto)}</p>
                </div>
              )}
              {prospecto.formaPago && (
                <div>
                  <p className="text-sm text-gray-600">Forma de pago</p>
                  <p className="font-semibold">{prospecto.formaPago}</p>
                </div>
              )}
              {prospecto.creditoPreaprobado && (
                <div>
                  <p className="text-sm text-gray-600">Crédito preaprobado</p>
                  <p className="font-semibold">{formatCurrency(prospecto.creditoPreaprobado)}</p>
                </div>
              )}
              {prospecto.origen && (
                <div>
                  <p className="text-sm text-gray-600">Origen</p>
                  <p className="font-semibold">{prospecto.origen}</p>
                </div>
              )}
            </div>

            {prospecto.ejecutivo && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">Ejecutivo asignado</p>
                <p className="font-semibold">{prospecto.ejecutivo.nombre}</p>
              </div>
            )}
          </div>

          {/* Propiedades de interés */}
          {prospecto.intereses && prospecto.intereses.length > 0 && (
            <div className="p-6 bg-white rounded-lg shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Propiedades de interés</h2>
              <div className="space-y-3">
                {prospecto.intereses.map((interes) => (
                  <div key={interes.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    {interes.propiedad.fotos && interes.propiedad.fotos[0] && (
                      <img
                        src={interes.propiedad.fotos[0]}
                        alt={interes.propiedad.titulo}
                        className="object-cover w-16 h-16 rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{interes.propiedad.titulo}</h3>
                      <p className="text-primary-600 font-semibold">{formatCurrency(interes.propiedad.precio)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de actividades */}
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Historial de actividades</h2>
              <button
                onClick={() => setModalNota(true)}
                className="px-3 py-1 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Agregar nota
              </button>
            </div>

            <div className="space-y-4">
              {prospecto.actividades && prospecto.actividades.length > 0 ? (
                prospecto.actividades.map((actividad) => (
                  <div key={actividad.id} className="flex gap-3 pb-4 border-b last:border-0">
                    <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full h-fit">
                      {actividad.tipo === 'LLAMADA' && <Phone className="w-4 h-4 text-gray-600" />}
                      {actividad.tipo === 'MENSAJE' && <MessageCircle className="w-4 h-4 text-gray-600" />}
                      {actividad.tipo === 'NOTA' && <FileText className="w-4 h-4 text-gray-600" />}
                      {actividad.tipo === 'VISITA' && <Calendar className="w-4 h-4 text-gray-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{actividad.titulo}</h4>
                          {actividad.descripcion && (
                            <p className="mt-1 text-sm text-gray-600">{actividad.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateTime(actividad.createdAt)}
                        {actividad.usuario && ` • ${actividad.usuario.nombre}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-600">Sin actividades registradas</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="mb-4 font-semibold text-gray-900">Cambiar etapa</h3>
            <select
              value={prospecto.etapa}
              onChange={(e) => actualizarEtapa(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="NUEVO">Nuevo</option>
              <option value="CONTACTADO">Contactado</option>
              <option value="VISITA">Visita</option>
              <option value="OFERTA">Oferta</option>
              <option value="APARTADO">Apartado</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </div>

          {/* Recordatorios */}
          {prospecto.recordatorios && prospecto.recordatorios.length > 0 && (
            <div className="p-6 mt-6 bg-white rounded-lg shadow">
              <h3 className="mb-4 font-semibold text-gray-900">Recordatorios pendientes</h3>
              <div className="space-y-3">
                {prospecto.recordatorios.map((recordatorio) => (
                  <div key={recordatorio.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium text-gray-900">{recordatorio.titulo}</h4>
                    <p className="text-sm text-gray-600">{formatDateTime(recordatorio.fechaRecordatorio)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal agregar nota */}
      {modalNota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg">
            <h3 className="mb-4 text-xl font-semibold">Agregar nota</h3>
            <form onSubmit={agregarNota}>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">Título</label>
                <input
                  type="text"
                  required
                  value={nuevaNota.titulo}
                  onChange={(e) => setNuevaNota({ ...nuevaNota, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  rows={4}
                  value={nuevaNota.descripcion}
                  onChange={(e) => setNuevaNota({ ...nuevaNota, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setModalNota(false)}
                  className="flex-1 px-4 py-2 font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal registrar llamada */}
      {modalLlamada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg">
            <h3 className="mb-4 text-xl font-semibold">Registrar llamada</h3>
            <form onSubmit={registrarLlamada}>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">Título</label>
                <input
                  type="text"
                  required
                  value={nuevaLlamada.titulo}
                  onChange={(e) => setNuevaLlamada({ ...nuevaLlamada, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">Notas de la llamada</label>
                <textarea
                  rows={4}
                  required
                  placeholder="¿Qué se habló en la llamada?"
                  value={nuevaLlamada.descripcion}
                  onChange={(e) => setNuevaLlamada({ ...nuevaLlamada, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setModalLlamada(false)}
                  className="flex-1 px-4 py-2 font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal agendar recordatorio */}
      {modalRecordatorio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg">
            <h3 className="mb-4 text-xl font-semibold">Agendar recordatorio</h3>
            <form onSubmit={agendarRecordatorio}>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Llamar para seguimiento"
                  value={nuevoRecordatorio.titulo}
                  onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  rows={2}
                  value={nuevoRecordatorio.descripcion}
                  onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Fecha</label>
                  <input
                    type="date"
                    required
                    value={nuevoRecordatorio.fecha}
                    onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Hora</label>
                  <input
                    type="time"
                    required
                    value={nuevoRecordatorio.hora}
                    onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, hora: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                >
                  Agendar
                </button>
                <button
                  type="button"
                  onClick={() => setModalRecordatorio(false)}
                  className="flex-1 px-4 py-2 font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
