/**
 * Tabla de tareas: dibuja las filas y aplica búsqueda y filtro por estado.
 */

import { ORDEN_PRIORIDAD, FILTRO_TODAS } from '../config/constantes.js';
import { html } from '../utils/dom.js';
import { formatearFecha, estaVencida, hoyISO, pluralizar } from '../utils/formato.js';
import { avatar } from './ui/avatar.js';
import { insigniaEstado, insigniaPrioridad } from './ui/insignia.js';

const CAMPOS_BUSQUEDA = ['titulo', 'descripcion', 'responsable'];

/** Filtra por estado y por texto (título, descripción o responsable). */
export function filtrarTareas(tareas, { estado = FILTRO_TODAS, busqueda = '' } = {}) {
  const texto = busqueda.trim().toLowerCase();

  return tareas.filter((tarea) =>
    (estado === FILTRO_TODAS || tarea.estado === estado) &&
    (!texto || CAMPOS_BUSQUEDA.some((campo) => tarea[campo]?.toLowerCase().includes(texto)))
  );
}

/** Pendientes primero, luego por fecha límite y después por prioridad. */
function ordenarTareas(tareas) {
  return [...tareas].sort((a, b) =>
    Number(a.estado === 'completada') - Number(b.estado === 'completada') ||
    a.fechaLimite.localeCompare(b.fechaLimite) ||
    ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]
  );
}

function plantillaFila(tarea, hoy) {
  const vencida = estaVencida(tarea, hoy);

  return html`
    <tr>
      <td data-etiqueta="Tarea">
        <p class="tarea__titulo">${tarea.titulo}</p>
        ${tarea.descripcion && html`<p class="tarea__descripcion" title="${tarea.descripcion}">${tarea.descripcion}</p>`}
      </td>
      <td data-etiqueta="Responsable">
        <span class="responsable">
          ${avatar(tarea.responsable)}
          ${tarea.responsable}
        </span>
      </td>
      <td data-etiqueta="Prioridad">
        ${insigniaPrioridad(tarea.prioridad)}
      </td>
      <td data-etiqueta="Estado">
        ${insigniaEstado(tarea.estado)}
      </td>
      <td data-etiqueta="Fecha límite">
        <time class="fecha${vencida ? ' fecha--vencida' : ''}" datetime="${tarea.fechaLimite}">
          ${formatearFecha(tarea.fechaLimite)}${vencida ? ' · Vencida' : ''}
        </time>
      </td>
    </tr>`;
}

/**
 * Dibuja la tabla.
 * @param {{ cuerpo: HTMLElement, vacio: HTMLElement, contador: HTMLElement }} elementos
 */
export function renderizarTabla({ cuerpo, vacio, contador }, tareas, filtros) {
  const visibles = ordenarTareas(filtrarTareas(tareas, filtros));
  const hoy = hoyISO(); // una sola vez por renderizado, no una por fila

  cuerpo.innerHTML = html`${visibles.map((tarea) => plantillaFila(tarea, hoy))}`;
  vacio.hidden = visibles.length > 0;
  contador.textContent = visibles.length === tareas.length
    ? pluralizar(tareas.length, 'tarea')
    : `${visibles.length} de ${pluralizar(tareas.length, 'tarea')}`;
}
