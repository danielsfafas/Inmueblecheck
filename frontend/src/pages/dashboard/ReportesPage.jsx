import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportesPage() {
  const [reporteGeneral, setReporteGeneral] = useState(null);
  const [reporteEjecutivos, setReporteEjecutivos] = useState([]);
  const [tiempoRespuesta, setTiempoRespuesta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    try {
      setLoading(true);
      const [general, ejecutivos, tiempo] = await Promise.all([
        api.get('/reportes/general'),
        api.get('/reportes/ejecutivos'),
        api.get('/reportes/tiempo-respuesta'),
      ]);

      setReporteGeneral(general.data);
      setReporteEjecutivos(ejecutivos.data);
      setTiempoRespuesta(tiempo.data);
    } catch (error) {
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Reportes</h1>

      {/* Reporte general */}
      <div className="p-4 sm:p-6 mb-6 bg-white rounded-lg shadow">
        <div className="flex items-center mb-4">
          <BarChart3 className="w-6 h-6 mr-2 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Resumen General</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-sm text-gray-600">Total de prospectos</p>
            <p className="text-3xl font-bold text-gray-900">{reporteGeneral?.prospectosNuevos || 0}</p>
          </div>

          {reporteGeneral?.prospectosPorEtapa && (
            <div>
              <p className="mb-2 text-sm text-gray-600">Por etapa</p>
              <div className="space-y-1">
                {reporteGeneral.prospectosPorEtapa.map((item) => (
                  <div key={item.etapa} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.etapa}:</span>
                    <span className="font-semibold">{item._count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reporteGeneral?.prospectosPorCalificacion && (
            <div>
              <p className="mb-2 text-sm text-gray-600">Por calificación</p>
              <div className="space-y-1">
                {reporteGeneral.prospectosPorCalificacion.map((item) => (
                  <div key={item.calificacion} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.calificacion}:</span>
                    <span className="font-semibold">{item._count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tiempo de respuesta */}
      {tiempoRespuesta && (
        <div className="p-4 sm:p-6 mb-6 bg-white rounded-lg shadow">
          <div className="flex items-center mb-4">
            <Clock className="w-6 h-6 mr-2 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Tiempo de Respuesta</h2>
          </div>
          <div>
            <p className="text-sm text-gray-600">Promedio de tiempo desde contacto hasta primera actividad</p>
            <p className="mt-2 text-4xl font-bold text-primary-600">{tiempoRespuesta.promedioHoras} horas</p>
            <p className="mt-1 text-sm text-gray-500">
              Basado en {tiempoRespuesta.prospectosAnalizados} prospectos
            </p>
          </div>
        </div>
      )}

      {/* Reporte por ejecutivo */}
      <div className="p-4 sm:p-6 bg-white rounded-lg shadow">
        <div className="flex items-center mb-4">
          <Users className="w-6 h-6 mr-2 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Desempeño por Ejecutivo</h2>
        </div>

        {/* Móvil: una tarjeta por ejecutivo con sus métricas en rejilla */}
        <ul className="md:hidden space-y-3">
          {reporteEjecutivos.map((reporte, index) => (
            <li key={index} className="rounded-lg border border-gray-200 p-3">
              <p className="font-medium text-gray-900">{reporte.ejecutivo}</p>
              <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                {[
                  ['Asignados', reporte.prospectosAsignados],
                  ['Nuevos', reporte.prospectosNuevos],
                  ['En Visita', reporte.prospectosEnVisita],
                  ['Cerrados', reporte.prospectosCerrados, 'text-green-700 font-semibold'],
                  ['Llamadas', reporte.llamadasRealizadas],
                  ['Visitas', reporte.visitasAgendadas],
                ].map(([label, valor, cls]) => (
                  <div key={label}>
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className={`tabular-nums ${cls || 'text-gray-900'}`}>{valor}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Ejecutivo
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Asignados
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Nuevos
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  En Visita
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Cerrados
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Llamadas
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Visitas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reporteEjecutivos.map((reporte, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-900">{reporte.ejecutivo}</td>
                  <td className="px-4 py-4 text-gray-900">{reporte.prospectosAsignados}</td>
                  <td className="px-4 py-4 text-gray-900">{reporte.prospectosNuevos}</td>
                  <td className="px-4 py-4 text-gray-900">{reporte.prospectosEnVisita}</td>
                  <td className="px-4 py-4 font-semibold text-green-600">{reporte.prospectosCerrados}</td>
                  <td className="px-4 py-4 text-gray-900">{reporte.llamadasRealizadas}</td>
                  <td className="px-4 py-4 text-gray-900">{reporte.visitasAgendadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
