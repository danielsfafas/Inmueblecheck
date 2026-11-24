import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConfiguracionPage() {
  const [config, setConfig] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const telefonoInputRef = useRef(null);
  const telefonoMovilRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const [configRes, usuariosRes] = await Promise.all([
        api.get('/inmobiliaria'),
        api.get('/inmobiliaria/usuarios'),
      ]);
      setConfig(configRes.data);
      setUsuarios(usuariosRes.data);
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await api.put('/inmobiliaria', config);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setGuardando(false);
    }
  };

  const actualizarTelefonoUsuario = async (usuarioId, telefono) => {
    try {
      await api.patch(`/inmobiliaria/usuarios/${usuarioId}`, { telefonoWhatsapp: telefono });
      toast.success('Teléfono actualizado');
      await cargarConfiguracion();
      setEditandoUsuario(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al actualizar teléfono');
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Configuración</h1>

      <form onSubmit={guardarConfiguracion} className="max-w-4xl">
        <div className="p-6 mb-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Información General</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Nombre comercial
              </label>
              <input
                type="text"
                value={config.nombre}
                onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Razón social
              </label>
              <input
                type="text"
                value={config.razonSocial}
                onChange={(e) => setConfig({ ...config, razonSocial: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                RFC
              </label>
              <input
                type="text"
                value={config.rfc || ''}
                onChange={(e) => setConfig({ ...config, rfc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                type="text"
                value={config.telefono}
                onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Domicilio completo <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={config.domicilio || ''}
                onChange={(e) => setConfig({ ...config, domicilio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Requerido por la LFPDPPP. Sin este dato no se puede publicar el sitio.
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Email de privacidad
              </label>
              <input
                type="email"
                value={config.emailPrivacidad}
                onChange={(e) => setConfig({ ...config, emailPrivacidad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Horario de atención
              </label>
              <input
                type="text"
                value={config.horario || ''}
                onChange={(e) => setConfig({ ...config, horario: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Lunes a Viernes: 9:00 - 18:00"
              />
            </div>
          </div>
        </div>

        <div className="p-6 mb-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Legal y Cumplimiento</h2>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Registro PROFECO
              </label>
              <input
                type="text"
                value={config.registroProfeco || ''}
                onChange={(e) => setConfig({ ...config, registroProfeco: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="PFC.B.E.7/123456-2024"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Licencia inmobiliaria estatal
              </label>
              <input
                type="text"
                value={config.licenciaEstatal || ''}
                onChange={(e) => setConfig({ ...config, licenciaEstatal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Leyenda PROFECO
              </label>
              <textarea
                rows={2}
                value={config.leyendaProfeco || ''}
                onChange={(e) => setConfig({ ...config, leyendaProfeco: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Para cualquier aclaración o reclamación..."
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Leyenda NOM-247
              </label>
              <textarea
                rows={2}
                value={config.leyendaNom247 || ''}
                onChange={(e) => setConfig({ ...config, leyendaNom247: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="El precio final puede variar según gastos notariales..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center px-6 py-3 font-medium text-white transition-colors bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </form>

      <div className="max-w-4xl mt-8">
        <div className="p-4 sm:p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Usuarios</h2>
          <p className="mb-4 text-sm text-gray-600">
            Configura el teléfono WhatsApp para recibir notificaciones de escalamiento
          </p>

          {/* Móvil: tarjetas con edición en línea y botón Guardar visible */}
          <ul className="lg:hidden divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {usuarios.map((usuario) => (
              <li key={usuario.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{usuario.nombre}</p>
                    <p className="text-sm text-gray-500 break-all">{usuario.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{usuario.rol}</p>
                  </div>
                  {editandoUsuario !== usuario.id && (
                    <button
                      type="button"
                      onClick={() => setEditandoUsuario(usuario.id)}
                      className="shrink-0 -mr-1 min-h-[44px] px-3 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50"
                    >
                      Editar
                    </button>
                  )}
                </div>
                {editandoUsuario === usuario.id ? (
                  <form
                    className="mt-2 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      actualizarTelefonoUsuario(usuario.id, telefonoMovilRef.current?.value || '');
                    }}
                  >
                    <label className="block text-xs font-medium text-gray-600" htmlFor={`tel-${usuario.id}`}>
                      WhatsApp
                    </label>
                    <input
                      id={`tel-${usuario.id}`}
                      ref={telefonoMovilRef}
                      type="tel"
                      inputMode="tel"
                      defaultValue={usuario.telefonoWhatsapp || ''}
                      placeholder="+5215512345678"
                      className="input-field"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 min-h-[44px] rounded-lg bg-primary-600 px-3 text-sm font-medium text-white hover:bg-primary-700">
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoUsuario(null)}
                        className="flex-1 min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-1 text-sm text-gray-700">
                    <span className="text-gray-500">WhatsApp: </span>
                    <span className="tabular-nums">{usuario.telefonoWhatsapp || '-'}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usuario.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 break-all">
                      {usuario.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {usuario.rol}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {editandoUsuario === usuario.id ? (
                        <input
                          type="tel"
                          defaultValue={usuario.telefonoWhatsapp || ''}
                          placeholder="+5215512345678"
                          ref={telefonoInputRef}
                          aria-label={`WhatsApp de ${usuario.nombre}`}
                          className="input-field w-44 py-1.5 tabular-nums"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              actualizarTelefonoUsuario(usuario.id, e.target.value);
                            } else if (e.key === 'Escape') {
                              setEditandoUsuario(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span>{usuario.telefonoWhatsapp || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      {editandoUsuario === usuario.id ? (
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => actualizarTelefonoUsuario(usuario.id, telefonoInputRef.current?.value || '')}
                            className="min-h-[36px] rounded-lg bg-primary-600 px-3 text-white hover:bg-primary-700"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoUsuario(null)}
                            className="min-h-[36px] rounded-lg px-3 text-gray-700 hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setEditandoUsuario(usuario.id)}
                          type="button"
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
