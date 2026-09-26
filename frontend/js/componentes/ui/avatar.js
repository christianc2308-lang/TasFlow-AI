/**
 * Avatar circular con las iniciales de una persona.
 * El tamaño lo decide el CSS del contenedor (p. ej. .responsable .avatar).
 */

import { html } from '../../utils/dom.js';
import { iniciales } from '../../utils/formato.js';

export function avatar(nombre) {
  return html`<span class="avatar" aria-hidden="true">${iniciales(nombre)}</span>`;
}
