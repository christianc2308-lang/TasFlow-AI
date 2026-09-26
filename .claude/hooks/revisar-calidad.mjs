#!/usr/bin/env node
/**
 * Hook PostToolUse de TaskFlow AI: revisa la calidad de cada archivo que
 * Claude crea o modifica y genera un informe breve.
 *
 *  Errores (❌)     → exit 2: Claude recibe el informe y debe corregirlo.
 *  Advertencias (⚠️) → exit 0 + additionalContext: Claude queda informado.
 *  Sin problemas    → exit 0 en silencio.
 *
 * Además guarda el último informe en .claude/reportes/ultimo-informe.md
 * y una línea por revisión en .claude/reportes/historial.log.
 *
 * Sin dependencias: solo Node.js. Debe tardar menos de 1 segundo.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, relative, resolve, basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PROYECTO = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const CARPETA_REPORTES = join(PROYECTO, '.claude', 'reportes');
const IGNORAR = /[\\/](node_modules|\.git|\.claude[\\/](reportes|hooks))[\\/]/;
// Añade este comentario a una línea para excluirla cuando sea intencionada.
const MARCA_IGNORAR = 'calidad-ignorar';
const MAX_LINEAS_ARCHIVO = 300;
const MAX_HALLAZGOS_POR_REGLA = 3;

// ---------------------------------------------------------------------
// Reglas por tipo de archivo
// nivel: 'error' | 'aviso' | 'info'
// ---------------------------------------------------------------------

/** Aplicadas a todos los archivos de texto. */
const REGLAS_COMUNES = [
  {
    nivel: 'error',
    patron: /\bsk-ant-[A-Za-z0-9_-]{10,}|\bghp_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}|\bAIza[0-9A-Za-z_-]{35}/,
    mensaje: 'Posible clave secreta escrita en el código (el repositorio es público). Muévela a .env.',
  },
  {
    nivel: 'info',
    patron: /\b(TODO|FIXME|HACK)\b/,
    mensaje: 'Comentario pendiente (TODO/FIXME).',
  },
];

const REGLAS_JS = [
  { nivel: 'error', patron: /^\s*debugger\s*;?/, mensaje: '`debugger` olvidado: detiene la app con las herramientas de desarrollo abiertas.' },
  { nivel: 'error', patron: /\beval\s*\(|new\s+Function\s*\(/, mensaje: 'Uso de eval / new Function: riesgo de seguridad.' },
  { nivel: 'aviso', patron: /\bvar\s+\w/, mensaje: 'Uso de `var`: usa `const` o `let`.' },
  { nivel: 'aviso', patron: /[^=!<>]==[^=]|!=[^=]/, mensaje: 'Comparación con ==/!=: usa ===/!== para evitar conversiones inesperadas.' },
  { nivel: 'aviso', patron: /console\.log\(/, mensaje: '`console.log` de depuración: quítalo o usa console.error para errores reales.' },
  { nivel: 'aviso', patron: /\balert\s*\(/, mensaje: '`alert()` bloquea la página: usa una notificación de la interfaz.' },
  { nivel: 'aviso', patron: /catch\s*(\([^)]*\))?\s*\{\s*\}/, mensaje: '`catch` vacío: el error se pierde sin avisar.' },
  {
    nivel: 'aviso',
    // La plantilla html`` (utils/dom.js) escapa por sí misma, así que no se marca.
    patron: /\.(innerHTML|outerHTML)\s*[+]?=(?!\s*html`).*\$\{(?![^}]*escaparHTML)/,
    mensaje: 'innerHTML con datos interpolados sin escapar: usa la plantilla html`` o escaparHTML() (posible XSS).',
  },
  { nivel: 'aviso', patron: /document\.write\s*\(/, mensaje: '`document.write` está desaconsejado.' },
];

const REGLAS_HTML = [
  { nivel: 'aviso', patron: /<img\b(?![^>]*\balt=)[^>]*>/i, mensaje: 'Imagen sin atributo `alt` (accesibilidad).' },
  { nivel: 'aviso', patron: /\son(click|change|submit|input|load)\s*=/i, mensaje: 'Evento en línea (onclick=…): usa addEventListener en el JS.' },
  { nivel: 'aviso', patron: /target=["']_blank["'](?![^>]*rel=["'][^"']*noopener)/i, mensaje: 'target="_blank" sin rel="noopener" (seguridad).' },
  { nivel: 'info', patron: /\sstyle=["']/i, mensaje: 'Estilo en línea: mejor en los archivos CSS.' },
];

const REGLAS_CSS = [
  { nivel: 'info', patron: /!important/, mensaje: '`!important` dificulta mantener los estilos.' },
];

/** Comprobaciones que miran el archivo completo, no línea a línea. */
function revisarArchivoCompleto(ruta, tipo, contenido, hallazgos) {
  const lineas = contenido.split(/\r?\n/);

  if (lineas.length > MAX_LINEAS_ARCHIVO && tipo !== 'json') {
    hallazgos.push({ nivel: 'info', linea: null, mensaje: `Archivo largo (${lineas.length} líneas): valora dividirlo.` });
  }

  if (tipo === 'js') {
    try {
      execFileSync(process.execPath, ['--check', ruta], { stdio: 'pipe', timeout: 5000 });
    } catch (error) {
      const detalle = String(error.stderr ?? error.message).split('\n').find((l) => /Error/.test(l)) ?? 'error de sintaxis';
      const linea = Number(String(error.stderr).match(/:(\d+)\s*\n/)?.[1]) || null;
      hallazgos.push({ nivel: 'error', linea, mensaje: `Sintaxis: ${detalle.trim()}` });
    }
  }

  if (tipo === 'json') {
    try {
      JSON.parse(contenido);
    } catch (error) {
      hallazgos.push({ nivel: 'error', linea: null, mensaje: `JSON inválido: ${error.message}` });
    }
  }

  if (tipo === 'html') {
    if (!/<html[^>]*\blang=/i.test(contenido) && /<html/i.test(contenido)) {
      hallazgos.push({ nivel: 'aviso', linea: null, mensaje: 'Falta el atributo `lang` en <html>.' });
    }
    if (/<html/i.test(contenido) && !/<title>/i.test(contenido)) {
      hallazgos.push({ nivel: 'aviso', linea: null, mensaje: 'Falta la etiqueta <title>.' });
    }
    if (/<html/i.test(contenido) && !/name=["']viewport["']/i.test(contenido)) {
      hallazgos.push({ nivel: 'aviso', linea: null, mensaje: 'Falta <meta name="viewport">: la página no será responsive.' });
    }
  }

  if (tipo === 'css') {
    const abiertas = (contenido.match(/\{/g) ?? []).length;
    const cerradas = (contenido.match(/\}/g) ?? []).length;
    if (abiertas !== cerradas) {
      hallazgos.push({ nivel: 'error', linea: null, mensaje: `Llaves desequilibradas: ${abiertas} "{" y ${cerradas} "}".` });
    }
    if (basename(ruta) !== 'variables.css') {
      const colores = contenido.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
      if (colores.length > 5) {
        hallazgos.push({ nivel: 'info', linea: null, mensaje: `${colores.length} colores fijos: usa las variables de variables.css.` });
      }
    }
  }
}

// ---------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------

function tipoDeArchivo(ruta) {
  const extension = extname(ruta).toLowerCase();
  if (['.js', '.mjs', '.cjs'].includes(extension)) return 'js';
  if (['.html', '.htm'].includes(extension)) return 'html';
  if (extension === '.css') return 'css';
  if (extension === '.json') return 'json';
  if (['.md', '.sql', '.txt', '.example', '.yml', '.yaml'].includes(extension)) return 'texto';
  return null; // imágenes, binarios… no se revisan
}

function esComentario(linea) {
  const recortada = linea.trim();
  return recortada.startsWith('//') || recortada.startsWith('*') || recortada.startsWith('/*') || recortada.startsWith('<!--');
}

function revisarLineas(contenido, reglas, hallazgos) {
  const lineas = contenido.split(/\r?\n/);
  for (const regla of reglas) {
    let encontrados = 0;
    lineas.forEach((linea, indice) => {
      // Las claves secretas se buscan también en comentarios; el resto no.
      const buscarEnComentarios = regla.nivel === 'error' || regla.mensaje.startsWith('Comentario');
      if (!buscarEnComentarios && esComentario(linea)) return;
      if (linea.includes(MARCA_IGNORAR) && regla.nivel !== 'error') return;
      if (regla.patron.test(linea)) {
        encontrados += 1;
        if (encontrados <= MAX_HALLAZGOS_POR_REGLA) {
          hallazgos.push({ nivel: regla.nivel, linea: indice + 1, mensaje: regla.mensaje });
        }
      }
    });
    if (encontrados > MAX_HALLAZGOS_POR_REGLA) {
      hallazgos.push({ nivel: regla.nivel, linea: null, mensaje: `…y ${encontrados - MAX_HALLAZGOS_POR_REGLA} más: ${regla.mensaje}` });
    }
  }
}

export function revisarArchivo(ruta) {
  const tipo = tipoDeArchivo(ruta);
  if (!tipo) return null;

  const contenido = readFileSync(ruta, 'utf8');
  const hallazgos = [];
  const reglasPorTipo = { js: REGLAS_JS, html: REGLAS_HTML, css: REGLAS_CSS, json: [], texto: [] };

  revisarLineas(contenido, [...REGLAS_COMUNES, ...reglasPorTipo[tipo]], hallazgos);
  revisarArchivoCompleto(ruta, tipo, contenido, hallazgos);
  return hallazgos;
}

const ICONO = { error: '❌', aviso: '⚠️', info: 'ℹ️' };
const ORDEN = { error: 0, aviso: 1, info: 2 };

function crearInforme(rutaRelativa, hallazgos) {
  const cuenta = (nivel, singular, plural) => {
    const total = hallazgos.filter((h) => h.nivel === nivel).length;
    return `${total} ${total === 1 ? singular : plural}`;
  };
  const resumen = [
    cuenta('error', 'error', 'errores'),
    cuenta('aviso', 'advertencia', 'advertencias'),
    cuenta('info', 'sugerencia', 'sugerencias'),
  ].join(' · ');

  const lineas = [...hallazgos]
    .sort((a, b) => ORDEN[a.nivel] - ORDEN[b.nivel] || (a.linea ?? 0) - (b.linea ?? 0))
    .map((h) => `${ICONO[h.nivel]} ${h.linea ? `L${h.linea}: ` : ''}${h.mensaje}`);

  return {
    resumen,
    texto: [`📋 Revisión de calidad · ${rutaRelativa}`, resumen, ...lineas].join('\n'),
  };
}

function guardarInforme(rutaRelativa, informe) {
  try {
    mkdirSync(CARPETA_REPORTES, { recursive: true });
    const fecha = new Date().toLocaleString('es-ES');
    writeFileSync(join(CARPETA_REPORTES, 'ultimo-informe.md'), `_${fecha}_\n\n\`\`\`\n${informe.texto}\n\`\`\`\n`);
    appendFileSync(join(CARPETA_REPORTES, 'historial.log'), `${fecha} | ${rutaRelativa} | ${informe.resumen}\n`);
  } catch {
    // Guardar el informe es opcional: nunca debe romper el hook.
  }
}

function leerEntrada() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function main() {
  const entrada = leerEntrada();
  const ruta = entrada.tool_input?.file_path;
  if (!ruta) return;

  const absoluta = resolve(ruta);
  const rutaRelativa = relative(PROYECTO, absoluta);

  // Solo archivos del proyecto que existan y no estén en carpetas ignoradas.
  if (rutaRelativa.startsWith('..') || IGNORAR.test(absoluta) || !existsSync(absoluta)) return;

  const hallazgos = revisarArchivo(absoluta);
  if (!hallazgos) return;

  const informe = crearInforme(rutaRelativa, hallazgos);
  guardarInforme(rutaRelativa, informe);

  if (hallazgos.some((h) => h.nivel === 'error')) {
    console.error(`${informe.texto}\n\nCorrige los errores (❌) antes de continuar.`);
    process.exit(2);
  }

  if (hallazgos.some((h) => h.nivel === 'aviso')) {
    console.log(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: informe.texto },
    }));
  }
}

// Solo se ejecuta al lanzarlo como hook, no al importarlo (p. ej. desde una prueba).
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
