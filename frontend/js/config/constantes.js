/**
 * Valores fijos de la aplicación. Coinciden con los usados en la base de
 * datos que se añadirá más adelante (tabla tareas: estado, prioridad).
 */

export const ESTADOS = Object.freeze({
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
});

export const PRIORIDADES = Object.freeze({
  urgente: 'Urgente',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
});

/** Orden para mostrar primero lo más importante. */
export const ORDEN_PRIORIDAD = Object.freeze({ urgente: 0, alta: 1, media: 2, baja: 3 });

export const FILTRO_TODAS = 'todas';
