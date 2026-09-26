/**
 * Modal "Nueva tarea": abrir, cerrar, validar y entregar los datos.
 * Usa el elemento nativo <dialog> de HTML5 (gestiona el foco y la tecla Esc).
 */

import { ESTADOS, PRIORIDADES } from '../config/constantes.js';
import { hoyISO } from '../utils/formato.js';

/** Campos obligatorios: cómo se validan y dónde se muestra su error. */
const CAMPOS_VALIDADOS = {
  titulo: {
    idError: 'error-titulo',
    validar: (valor) => {
      if (!valor) return 'El título es obligatorio.';
      if (valor.length < 3) return 'El título debe tener al menos 3 caracteres.';
      return '';
    },
  },
  responsable: {
    idError: 'error-responsable',
    validar: (valor) => (valor ? '' : 'Indica quién es el responsable.'),
  },
  fechaLimite: {
    idError: 'error-fecha',
    validar: (valor) => (valor ? '' : 'Selecciona una fecha límite.'),
  },
};

/** Devuelve el valor si es una clave propia de la lista; si no, el valor por defecto. */
function valorPermitido(lista, valor, porDefecto) {
  return Object.hasOwn(lista, valor) ? valor : porDefecto;
}

function leerFormulario(formulario) {
  const datos = Object.fromEntries(new FormData(formulario));
  return {
    titulo: datos.titulo.trim(),
    descripcion: datos.descripcion.trim(),
    responsable: datos.responsable.trim(),
    fechaLimite: datos.fechaLimite,
    // Solo se aceptan valores conocidos, aunque alguien manipule el HTML.
    prioridad: valorPermitido(PRIORIDADES, datos.prioridad, 'media'),
    estado: valorPermitido(ESTADOS, datos.estado, 'pendiente'),
  };
}

/** Muestra (o borra, si el mensaje está vacío) el error de un campo. */
function mostrarError(formulario, campo, mensaje) {
  document.getElementById(CAMPOS_VALIDADOS[campo].idError).textContent = mensaje;
  formulario.elements[campo].setAttribute('aria-invalid', String(Boolean(mensaje)));
}

/** Valida todos los campos y enfoca el primero con error. Devuelve true si todo es válido. */
function validar(formulario, datos) {
  let primerCampoInvalido = null;

  for (const [campo, { validar: regla }] of Object.entries(CAMPOS_VALIDADOS)) {
    const mensaje = regla(datos[campo]);
    mostrarError(formulario, campo, mensaje);
    if (mensaje && !primerCampoInvalido) primerCampoInvalido = formulario.elements[campo];
  }

  primerCampoInvalido?.focus();
  return !primerCampoInvalido;
}

function limpiarErrores(formulario) {
  for (const [campo, { idError }] of Object.entries(CAMPOS_VALIDADOS)) {
    document.getElementById(idError).textContent = '';
    formulario.elements[campo].removeAttribute('aria-invalid');
  }
}

/**
 * Prepara el modal.
 * @param {{ modal: HTMLDialogElement, formulario: HTMLFormElement, botonAbrir: HTMLElement }} elementos
 * @param {(datos: object) => void} alGuardar se llama con los datos validados
 */
export function iniciarModalTarea({ modal, formulario, botonAbrir }, alGuardar) {
  function abrir() {
    formulario.reset();
    limpiarErrores(formulario);
    formulario.elements.fechaLimite.min = hoyISO();
    modal.showModal();
    formulario.elements.titulo.focus();
  }

  function cerrar() {
    modal.close();
    botonAbrir.focus();
  }

  botonAbrir.addEventListener('click', abrir);

  modal.querySelectorAll('[data-cerrar-modal]').forEach((boton) => {
    boton.addEventListener('click', cerrar);
  });

  // Cerrar al hacer clic fuera del contenido (sobre el fondo oscuro).
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) cerrar();
  });

  // Quitar el error de un campo en cuanto el usuario lo corrige.
  formulario.addEventListener('input', (evento) => {
    const campo = evento.target.name;
    if (Object.hasOwn(CAMPOS_VALIDADOS, campo) && evento.target.getAttribute('aria-invalid') === 'true') {
      mostrarError(formulario, campo, CAMPOS_VALIDADOS[campo].validar(evento.target.value.trim()));
    }
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const datos = leerFormulario(formulario);
    if (!validar(formulario, datos)) return;

    alGuardar(datos);
    cerrar();
  });
}
