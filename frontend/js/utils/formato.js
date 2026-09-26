/**
 * Funciones de formato y de fechas. Todas son "puras": no tocan el DOM,
 * solo reciben datos y devuelven texto.
 */

const formateadorFecha = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Date → 'YYYY-MM-DD' usando la hora local (sin desfase por zona horaria). */
function aFechaISO(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** 'YYYY-MM-DD' → Date local a medianoche. */
function aFechaLocal(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/** Suma días a hoy y devuelve 'YYYY-MM-DD' (útil para datos de ejemplo). */
export function diasDesdeHoy(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return aFechaISO(fecha);
}

/** Fecha de hoy en formato 'YYYY-MM-DD' según la hora local. */
export function hoyISO() {
  return diasDesdeHoy(0);
}

/**
 * '2026-10-10' → '10 oct 2026'.
 * Si la fecha no es válida devuelve un texto de respaldo en lugar de lanzar
 * un error, para que un dato incorrecto no impida dibujar el resto de la vista.
 */
export function formatearFecha(fechaISO) {
  if (!FORMATO_ISO.test(fechaISO ?? '')) return 'Fecha no válida';
  const fecha = aFechaLocal(fechaISO);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no válida';
  return formateadorFecha.format(fecha).replace('.', '');
}

/**
 * true si la fecha ya pasó y la tarea no está completada.
 * Recibe `hoy` para no recalcular la fecha actual en cada fila de la tabla.
 */
export function estaVencida(tarea, hoy = hoyISO()) {
  return tarea.estado !== 'completada' && tarea.fechaLimite < hoy;
}

/** 'Christian Castro' → 'CC' */
export function iniciales(nombre) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

/** Texto en singular o plural: pluralizar(1, 'tarea') → '1 tarea' */
export function pluralizar(cantidad, palabra, plural = `${palabra}s`) {
  return `${cantidad} ${cantidad === 1 ? palabra : plural}`;
}
