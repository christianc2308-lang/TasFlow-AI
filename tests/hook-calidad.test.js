import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { revisarArchivo } from '../.claude/hooks/revisar-calidad.mjs';

// Clave con formato real pero inventada, construida por partes para que este
// archivo de prueba no active la propia regla de claves secretas.
const CLAVE_FALSA = ['sk', 'ant', 'api03', 'ABCDEFGHIJKLMNOP1234'].join('-');

function revisarContenido(nombre, contenido) {
  const carpeta = mkdtempSync(join(tmpdir(), 'calidad-'));
  const ruta = join(carpeta, nombre);
  writeFileSync(ruta, contenido);
  try {
    return revisarArchivo(ruta);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

const niveles = (hallazgos) => hallazgos.map((h) => h.nivel);

test('código limpio no genera avisos', () => {
  assert.deepEqual(revisarContenido('ok.js', 'export const suma = (a, b) => a + b;\n'), []);
});

test('detecta errores de sintaxis y claves secretas', () => {
  assert.ok(niveles(revisarContenido('roto.js', 'function (')).includes('error'));
  const conClave = revisarContenido('clave.js', `const k = "${CLAVE_FALSA}";\n`);
  assert.ok(conClave.some((h) => h.nivel === 'error' && /clave secreta/.test(h.mensaje)));
});

test('detecta malas prácticas como advertencias', () => {
  // Código de ejemplo con malas prácticas, montado por partes para que el
  // propio hook no marque este archivo de prueba.
  const codigoMalo = ['v' + 'ar x = 1;', 'if (x =' + '= 2) console' + '.log(x);'].join('\n');
  const hallazgos = revisarContenido('mal.js', codigoMalo);
  assert.equal(hallazgos.filter((h) => h.nivel === 'aviso').length, 3);
});

test('la marca calidad-ignorar silencia avisos pero no errores', () => {
  const codigo = ['console' + '.log(1); // calidad-ignorar', `const k = "${CLAVE_FALSA}"; // calidad-ignorar`].join('\n');
  const hallazgos = revisarContenido('marca.js', codigo);
  assert.deepEqual(niveles(hallazgos), ['error']);
});

test('ignora tipos de archivo que no revisa', () => {
  assert.equal(revisarContenido('imagen.png', 'binario'), null);
});
