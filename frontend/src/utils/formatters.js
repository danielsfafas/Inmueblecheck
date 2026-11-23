export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatRelativeTime = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diffInSeconds = Math.floor((now - target) / 1000);

  if (diffInSeconds < 60) return 'Hace un momento';
  if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  
  return formatDate(date);
};

export const getCalificacionColor = (calificacion) => {
  switch (calificacion) {
    case 'CALIENTE':
      return 'bg-red-100 text-red-800';
    case 'TIBIO':
      return 'bg-yellow-100 text-yellow-800';
    case 'FRIO':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getCalificacionLabel = (calificacion) => {
  switch (calificacion) {
    case 'CALIENTE':
      return 'Caliente';
    case 'TIBIO':
      return 'Tibio';
    case 'FRIO':
      return 'Frío';
    default:
      return calificacion;
  }
};

export const getEtapaColor = (etapa) => {
  switch (etapa) {
    case 'NUEVO':
      return 'bg-purple-100 text-purple-800';
    case 'CONTACTADO':
      return 'bg-blue-100 text-blue-800';
    case 'VISITA':
      return 'bg-cyan-100 text-cyan-800';
    case 'OFERTA':
      return 'bg-orange-100 text-orange-800';
    case 'APARTADO':
      return 'bg-yellow-100 text-yellow-800';
    case 'CERRADO':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getEtapaLabel = (etapa) => {
  switch (etapa) {
    case 'NUEVO':
      return 'Nuevo';
    case 'CONTACTADO':
      return 'Contactado';
    case 'VISITA':
      return 'Visita';
    case 'OFERTA':
      return 'Oferta';
    case 'APARTADO':
      return 'Apartado';
    case 'CERRADO':
      return 'Cerrado';
    default:
      return etapa;
  }
};
