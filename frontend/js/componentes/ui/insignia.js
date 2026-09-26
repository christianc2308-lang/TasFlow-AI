/**
 * Insignias de color para la prioridad y el estado de una tarea.
 */

import { ESTADOS, PRIORIDADES } from '../../config/constantes.js';
import { html } from '../../utils/dom.js';

function insignia(valor, etiqueta) {
  return html`<span class="insignia insignia--${valor}">${etiqueta}</span>`;
}

/** 'alta' → insignia naranja "Alta" */
export function insigniaPrioridad(prioridad) {
  return insignia(prioridad, PRIORIDADES[prioridad]);
}

/** 'en_progreso' → insignia azul "En progreso" */
export function insigniaEstado(estado) {
  return insignia(estado, ESTADOS[estado]);
}
