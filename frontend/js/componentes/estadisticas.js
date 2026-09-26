/**
 * Tarjetas de estadísticas: Total, Pendientes, En progreso y Completadas.
 */

import { html } from '../utils/dom.js';
import { ICONOS } from './ui/iconos.js';

const ICONO_POR_TARJETA = {
  total: ICONOS.tarea,
  pendiente: ICONOS.reloj,
  en_progreso: ICONOS.progreso,
  completada: ICONOS.completada,
};

function porcentaje(parte, total) {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

/** Cuenta las tareas por estado recorriendo la lista una sola vez. */
export function calcularEstadisticas(tareas) {
  const conteo = { total: tareas.length, pendiente: 0, en_progreso: 0, completada: 0 };
  for (const { estado } of tareas) {
    if (estado !== 'total' && Object.hasOwn(conteo, estado)) conteo[estado] += 1;
  }
  return conteo;
}

function barraProgreso(valor) {
  return html`<div class="barra-progreso" role="progressbar" aria-valuenow="${valor}" aria-valuemin="0" aria-valuemax="100" aria-label="Porcentaje completado">
         <div class="barra-progreso__relleno" style="width: ${valor}%"></div>
       </div>`;
}

function plantillaTarjeta({ clave, etiqueta, valor, detalle, progreso }) {
  return html`
    <article class="tarjeta estadistica estadistica--${clave}">
      <div>
        <p class="estadistica__etiqueta">${etiqueta}</p>
        <p class="estadistica__valor">${valor}</p>
        <p class="estadistica__detalle">${detalle}</p>
        ${progreso !== undefined && barraProgreso(progreso)}
      </div>
      <span class="estadistica__icono">${ICONO_POR_TARJETA[clave]}</span>
    </article>`;
}

/** Dibuja las cuatro tarjetas dentro del contenedor. */
export function renderizarEstadisticas(contenedor, tareas) {
  const datos = calcularEstadisticas(tareas);
  const avance = porcentaje(datos.completada, datos.total);

  const tarjetas = [
    { clave: 'total', etiqueta: 'Tareas totales', valor: datos.total, detalle: 'Registradas en el sistema' },
    { clave: 'pendiente', etiqueta: 'Pendientes', valor: datos.pendiente, detalle: `${porcentaje(datos.pendiente, datos.total)}% del total` },
    { clave: 'en_progreso', etiqueta: 'En progreso', valor: datos.en_progreso, detalle: `${porcentaje(datos.en_progreso, datos.total)}% del total` },
    { clave: 'completada', etiqueta: 'Completadas', valor: datos.completada, detalle: `${avance}% de avance`, progreso: avance },
  ];

  contenedor.innerHTML = html`${tarjetas.map(plantillaTarjeta)}`;
}
