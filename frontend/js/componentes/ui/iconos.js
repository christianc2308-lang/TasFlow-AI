/**
 * Iconos SVG reutilizables (trazo de 24×24, heredan el color del texto).
 * Un único lugar para cada icono evita copias distintas del mismo dibujo.
 */

import { htmlDeConfianza } from '../../utils/dom.js';

const icono = (trazos) => htmlDeConfianza(`<svg viewBox="0 0 24 24" aria-hidden="true">${trazos}</svg>`);

export const ICONOS = Object.freeze({
  tarea: icono('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  reloj: icono('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  progreso: icono('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>'),
  completada: icono('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
});
