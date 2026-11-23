import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function generarVideoPropiedad(propiedad, inmobiliaria) {
  try {
    console.log(`📹 Generando video para propiedad: ${propiedad.id}`);

    // Crear directorio de salida si no existe
    const outputDir = path.join(process.cwd(), 'videos');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `propiedad-${propiedad.id}.mp4`);

    // Si ya existe el video, devolverlo
    if (existsSync(outputPath)) {
      console.log('✅ Video ya existe, usando caché');
      return {
        success: true,
        videoPath: outputPath,
        url: `/api/videos/files/propiedad-${propiedad.id}.mp4`,
      };
    }

    // Verificar si ffmpeg está disponible
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.error('❌ ffmpeg no está instalado');
      return {
        success: false,
        error: 'ffmpeg no está instalado en el servidor',
        simulado: true,
      };
    }

    // Preparar imágenes (en producción real, estas serían las fotos de la propiedad)
    // Por ahora, generamos un video con texto y color de fondo
    const frames = [];
    
    // Frame 1: Título y ubicación
    frames.push({
      text: propiedad.titulo,
      subtitle: `${propiedad.colonia}, ${propiedad.ciudad}`,
      duration: 3,
      color: '#3b82f6', // primary-600
    });

    // Frame 2: Precio
    frames.push({
      text: formatCurrency(propiedad.precio),
      subtitle: propiedad.tipo === 'VENTA' ? 'Venta' : 'Renta mensual',
      duration: 2,
      color: '#10b981', // green-600
    });

    // Frame 3: Características
    const caracteristicas = [];
    if (propiedad.recamaras > 0) caracteristicas.push(`${propiedad.recamaras} recámaras`);
    if (propiedad.banos > 0) caracteristicas.push(`${propiedad.banos} baños`);
    if (propiedad.metrosConstruccion) caracteristicas.push(`${propiedad.metrosConstruccion} m²`);
    
    frames.push({
      text: caracteristicas.join(' • '),
      subtitle: 'Características principales',
      duration: 2.5,
      color: '#8b5cf6', // purple-600
    });

    // Frame 4: Call to action
    frames.push({
      text: '¡Agenda tu visita!',
      subtitle: inmobiliaria.telefono,
      duration: 2.5,
      color: '#f59e0b', // amber-600
    });

    // Generar video usando filtro complex de ffmpeg
    // Como no tenemos imágenes reales, generamos frames de colores con texto
    const filterComplex = frames.map((frame, index) => {
      const startTime = frames.slice(0, index).reduce((sum, f) => sum + f.duration, 0);
      const endTime = startTime + frame.duration;
      
      return `color=c=${frame.color}:s=1080x1920:d=${frame.duration}:r=30[v${index}];` +
             `[v${index}]drawtext=text='${escapeText(frame.text)}':` +
             `fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-100:` +
             `borderw=3:bordercolor=black,` +
             `drawtext=text='${escapeText(frame.subtitle)}':` +
             `fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2+100:` +
             `borderw=2:bordercolor=black[v${index}text]`;
    }).join(';');

    const inputs = frames.map((_, i) => `[v${i}text]`).join('');
    const concat = `${inputs}concat=n=${frames.length}:v=1:a=0[outv]`;
    const fullFilter = `${filterComplex};${concat}`;

    // Comando ffmpeg
    const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -filter_complex "${fullFilter}" -map "[outv]" -map 0:a -c:v libx264 -preset ultrafast -c:a aac -t ${frames.reduce((sum, f) => sum + f.duration, 0)} -pix_fmt yuv420p -y "${outputPath}"`;

    console.log('🎬 Ejecutando ffmpeg...');
    await execAsync(command, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer

    console.log('✅ Video generado exitosamente');

    return {
      success: true,
      videoPath: outputPath,
      url: `/api/videos/files/propiedad-${propiedad.id}.mp4`,
      duration: frames.reduce((sum, f) => sum + f.duration, 0),
      format: 'mp4',
      resolution: '1080x1920',
    };

  } catch (error) {
    console.error('❌ Error generando video:', error);
    return {
      success: false,
      error: error.message,
      simulado: true,
    };
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeText(text) {
  // Escapar caracteres especiales para ffmpeg
  return text
    .replace(/'/g, "\\\\'")
    .replace(/:/g, "\\:")
    .replace(/\$/g, "\\$");
}
