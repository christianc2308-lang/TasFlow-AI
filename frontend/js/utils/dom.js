/**
 * Utilidades para generar HTML y acceder al DOM de forma segura.
 */

const ENTIDADES_HTML = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa texto antes de insertarlo en el HTML.
 * Evita que un título como "<script>…" se ejecute (ataque XSS).
 */
export function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, (caracter) => ENTIDADES_HTML[caracter]);
}

/** Fragmento de HTML ya seguro: html`` no lo vuelve a escapar. */
class HTMLSeguro {
  constructor(contenido) {
    this.contenido = contenido;
  }

  toString() {
    return this.contenido;
  }
}

/**
 * Marca como seguro un HTML de confianza escrito por nosotros (p. ej. un icono SVG).
 * Nunca debe usarse con datos que vengan del usuario.
 */
export function htmlDeConfianza(contenido) {
  return new HTMLSeguro(String(contenido));
}

function convertirValor(valor) {
  if (valor instanceof HTMLSeguro) return valor.contenido;
  if (Array.isArray(valor)) return valor.map(convertirValor).join('');
  if (valor === null || valor === undefined || valor === false) return '';
  return escaparHTML(valor);
}

/**
 * Plantilla que escapa TODOS los valores interpolados por defecto.
 * Así la seguridad no depende de acordarse de llamar a escaparHTML().
 *
 *   html`<td>${tarea.titulo}</td>`        → el título se escapa
 *   html`<ul>${items.map(plantilla)}</ul>` → los arrays se unen
 *   html`${condicion && html`<b>sí</b>`}` → false/null/undefined no se muestran
 *
 * Devuelve un HTMLSeguro: se puede anidar en otra plantilla o asignar
 * directamente a innerHTML (se convierte en texto con toString()).
 */
export function html(partes, ...valores) {
  let resultado = partes[0];
  valores.forEach((valor, indice) => {
    resultado += convertirValor(valor) + partes[indice + 1];
  });
  return new HTMLSeguro(resultado);
}

/**
 * Obtiene un elemento obligatorio por id.
 * Si no existe, falla al arrancar con un mensaje claro en lugar de
 * provocar más tarde un error confuso al usar null.
 */
export function obtenerElemento(id) {
  const elemento = document.getElementById(id);
  if (!elemento) {
    throw new Error(`No se encontró el elemento #${id} en el HTML.`);
  }
  return elemento;
}
