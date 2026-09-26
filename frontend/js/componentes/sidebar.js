/**
 * Barra lateral: en pantallas pequeñas se abre y cierra con el botón de menú.
 */

const CLASE_ABIERTA = 'is-abierta';
const PANTALLA_ESCRITORIO = window.matchMedia('(min-width: 1025px)');

/**
 * @param {{ sidebar: HTMLElement, fondo: HTMLElement, boton: HTMLButtonElement }} elementos
 */
export function iniciarSidebar({ sidebar, fondo, boton }) {
  function abrir() {
    sidebar.classList.add(CLASE_ABIERTA);
    fondo.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-label', 'Cerrar menú');
  }

  function cerrar() {
    sidebar.classList.remove(CLASE_ABIERTA);
    fondo.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir menú');
  }

  boton.addEventListener('click', () => {
    sidebar.classList.contains(CLASE_ABIERTA) ? cerrar() : abrir();
  });

  fondo.addEventListener('click', cerrar);

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && sidebar.classList.contains(CLASE_ABIERTA)) {
      cerrar();
      boton.focus();
    }
  });

  // Si se agranda la ventana con el menú abierto, se restablece.
  PANTALLA_ESCRITORIO.addEventListener('change', (evento) => {
    if (evento.matches) cerrar();
  });
}
