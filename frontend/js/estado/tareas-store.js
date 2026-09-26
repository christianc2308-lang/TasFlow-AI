/**
 * Almacén de tareas: la única fuente de datos de la app.
 *
 * Por ahora guarda las tareas en memoria (se reinician al recargar).
 * Cuando exista el backend, solo habrá que cambiar este archivo para
 * que lea y guarde en la API; el resto de la app no cambia.
 */

import { TAREAS_INICIALES } from '../datos/tareas-iniciales.js';

let tareas = TAREAS_INICIALES.map((tarea) => ({ ...tarea }));
let siguienteId = Math.max(0, ...tareas.map((tarea) => tarea.id)) + 1;
const suscriptores = new Set();

function notificarCambios() {
  const copia = obtenerTareas();
  suscriptores.forEach((funcion) => funcion(copia));
}

/** Devuelve una copia para que nadie modifique el estado por accidente. */
export function obtenerTareas() {
  return tareas.map((tarea) => ({ ...tarea }));
}

/**
 * Añade una tarea y avisa a los componentes suscritos.
 * @param {{ titulo: string, descripcion?: string, responsable: string,
 *           prioridad: string, estado: string, fechaLimite: string }} datos
 * @returns {object} la tarea creada, con su id
 */
export function agregarTarea(datos) {
  // El id va al final: siempre lo asigna el almacén, nunca los datos recibidos.
  const nueva = { descripcion: '', ...datos, id: siguienteId++ };
  tareas = [nueva, ...tareas];
  notificarCambios();
  return { ...nueva };
}

/**
 * Registra una función que se ejecuta cada vez que cambian las tareas.
 * Devuelve otra función para cancelar la suscripción.
 */
export function suscribirse(funcion) {
  suscriptores.add(funcion);
  return () => suscriptores.delete(funcion);
}
