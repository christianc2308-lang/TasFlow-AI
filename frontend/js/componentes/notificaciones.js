/**
 * Avisos flotantes temporales (toasts), por ejemplo "Tarea creada".
 */

import { ICONOS } from './ui/iconos.js';

const DURACION_MS = 3500;

let contenedor = null;

export function iniciarNotificaciones(elemento) {
  contenedor = elemento;
}

export function mostrarNotificacion(mensaje) {
  if (!contenedor) return;

  const aviso = document.createElement('div');
  aviso.className = 'notificacion';
  aviso.innerHTML = ICONOS.completada;
  aviso.append(mensaje); // texto plano: no se interpreta como HTML
  contenedor.append(aviso);

  setTimeout(() => {
    aviso.classList.add('is-saliendo');
    aviso.addEventListener('transitionend', () => aviso.remove(), { once: true });
  }, DURACION_MS);
}
