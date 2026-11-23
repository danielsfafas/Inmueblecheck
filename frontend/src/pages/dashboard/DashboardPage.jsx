import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Building2, Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    prospectosNuevos: 0,
    prospectosCalientes: 0,
    propiedadesDisponibles: 0,
    recordatoriosPendientes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      const [prospectos, propiedades, recordatorios] = await Promise.all([
        api.get('/prospectos'),
        api.get('/propiedades'),
        api.get('/recordatorios', { params: { completado: false } }),
      ]);

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      setStats({
        prospectosNuevos: prospectos.data.filter(
          (p) => new Date(p.createdAt) >= hoy
        ).length,
        prospectosCalientes: prospectos.data.filter((p) => p.calificacion === 'CALIENTE').length,
        propiedadesDisponibles: propiedades.data.filter((p) => p.estado === 'DISPONIBLE').length,
        recordatoriosPendientes: recordatorios.data.length,
      });
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/admin/prospectos?etapa=NUEVO"
          className="p-6 transition-shadow bg-white rounded-lg shadow hover:shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Prospectos Nuevos</h3>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.prospectosNuevos}</p>
          <p className="mt-1 text-xs text-gray-500">Hoy</p>
        </Link>

        <Link
          to="/admin/prospectos?calificacion=CALIENTE"
          className="p-6 transition-shadow bg-white rounded-lg shadow hover:shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Prospectos Calientes</h3>
            <TrendingUp className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.prospectosCalientes}</p>
          <p className="mt-1 text-xs text-gray-500">Alta prioridad</p>
        </Link>

        <Link
          to="/admin/propiedades"
          className="p-6 transition-shadow bg-white rounded-lg shadow hover:shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Propiedades Disponibles</h3>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.propiedadesDisponibles}</p>
          <p className="mt-1 text-xs text-gray-500">Activas</p>
        </Link>

        <Link
          to="/admin/recordatorios"
          className="p-6 transition-shadow bg-white rounded-lg shadow hover:shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Recordatorios Pendientes</h3>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.recordatoriosPendientes}</p>
          <p className="mt-1 text-xs text-gray-500">Por completar</p>
        </Link>
      </div>

      {/* Accesos rápidos */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Accesos rápidos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/admin/prospectos"
            className="p-4 transition-colors border-2 border-gray-200 rounded-lg hover:border-primary-500"
          >
            <h3 className="font-medium text-gray-900">Ver todos los prospectos</h3>
            <p className="text-sm text-gray-600">Gestiona tu embudo de ventas</p>
          </Link>

          <Link
            to="/admin/propiedades"
            className="p-4 transition-colors border-2 border-gray-200 rounded-lg hover:border-primary-500"
          >
            <h3 className="font-medium text-gray-900">Administrar propiedades</h3>
            <p className="text-sm text-gray-600">Publica y edita tu catálogo</p>
          </Link>

          <Link
            to="/admin/reportes"
            className="p-4 transition-colors border-2 border-gray-200 rounded-lg hover:border-primary-500"
          >
            <h3 className="font-medium text-gray-900">Ver reportes</h3>
            <p className="text-sm text-gray-600">Analiza tu desempeño</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
