import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConfiguracionPage() {
  const [config, setConfig] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
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
        api.get('/auth/usuarios'),
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
      await api.patch(`/auth/usuarios/${usuarioId}`, { telefonoWhatsapp: telefono });
      toast.success('Teléfono actualizado');
      await cargarConfiguracion();
      setEditandoUsuario(null);
    } catch (error) {
      toast.error('Error al actualizar teléfono');
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
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Usuarios</h2>
          <p className="mb-4 text-sm text-gray-600">
            Configura el teléfono WhatsApp para recibir notificaciones de escalamiento
          </p>

          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usuario.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usuario.rol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editandoUsuario === usuario.id ? (
                        <input
                          type="tel"
                          defaultValue={usuario.telefonoWhatsapp || ''}
                          placeholder="+5215512345678"
                          className="px-2 py-1 border border-gray-300 rounded"
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editandoUsuario === usuario.id ? (
                        <button
                          onClick={() => setEditandoUsuario(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditandoUsuario(usuario.id)}
                          className="text-indigo-600 hover:text-indigo-900"
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
