/**
 * Punto de entrada de TaskFlow AI.
 * Conecta el almacén de tareas con los componentes de la interfaz.
 */

import { FILTRO_TODAS } from './config/constantes.js';
import { obtenerTareas, agregarTarea, suscribirse } from './estado/tareas-store.js';
import { renderizarEstadisticas } from './componentes/estadisticas.js';
import { renderizarTabla } from './componentes/tabla-tareas.js';
import { iniciarModalTarea } from './componentes/modal-tarea.js';
import { iniciarSidebar } from './componentes/sidebar.js';
import { iniciarNotificaciones, mostrarNotificacion } from './componentes/notificaciones.js';
import { obtenerElemento } from './utils/dom.js';

const elementos = {
  estadisticas: obtenerElemento('estadisticas'),
  tabla: {
    cuerpo: obtenerElemento('cuerpo-tabla'),
    vacio: obtenerElemento('estado-vacio'),
    contador: obtenerElemento('contador-tareas'),
  },
  buscador: obtenerElemento('buscador'),
  filtros: document.querySelectorAll('.filtro'),
  saludo: obtenerElemento('saludo'),
};

// Filtros activos de la tabla
const filtros = { estado: FILTRO_TODAS, busqueda: '' };

function renderizar(tareas = obtenerTareas()) {
  renderizarEstadisticas(elementos.estadisticas, tareas);
  renderizarTabla(elementos.tabla, tareas, filtros);
}

function textoSaludo(hora) {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function mostrarSaludo() {
  const ahora = new Date();
  const fecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(ahora);
  elementos.saludo.textContent = `${textoSaludo(ahora.getHours())} 👋 Hoy es ${fecha}. Este es el resumen de tus tareas.`;
}

/** Marca un botón de filtro como activo y desmarca los demás. */
function activarFiltro(botonActivo) {
  elementos.filtros.forEach((boton) => {
    const activo = boton === botonActivo;
    boton.classList.toggle('is-activo', activo);
    boton.setAttribute('aria-pressed', String(activo));
  });
}

function iniciarFiltros() {
  elementos.filtros.forEach((boton) => {
    boton.addEventListener('click', () => {
      filtros.estado = boton.dataset.estado;
      activarFiltro(boton);
      renderizar();
    });
  });

  elementos.buscador.addEventListener('input', (evento) => {
    filtros.busqueda = evento.target.value;
    renderizar();
  });
}

function crearTarea(datos) {
  const tarea = agregarTarea(datos);
  mostrarNotificacion(`Tarea "${tarea.titulo}" creada correctamente`);
}

function iniciar() {
  mostrarSaludo();
  iniciarNotificaciones(obtenerElemento('notificaciones'));

  iniciarSidebar({
    sidebar: obtenerElemento('sidebar'),
    fondo: obtenerElemento('sidebar-fondo'),
    boton: obtenerElemento('boton-menu'),
  });

  iniciarModalTarea(
    {
      modal: obtenerElemento('modal-tarea'),
      formulario: obtenerElemento('formulario-tarea'),
      botonAbrir: obtenerElemento('boton-nueva-tarea'),
    },
    crearTarea
  );

  iniciarFiltros();
  suscribirse(renderizar); // cada cambio en las tareas vuelve a dibujar la vista
  renderizar();
}

iniciar();
