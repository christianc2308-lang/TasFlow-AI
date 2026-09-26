// Comprueba la sintaxis de todos los archivos JavaScript del proyecto.
// Uso: npm run check  → termina con código 1 si algún archivo tiene errores.

import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const CARPETAS_IGNORADAS = new Set(['node_modules', '.git', 'reportes']);
const EXTENSIONES = /\.(m?js)$/;

function* archivosJS(carpeta) {
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    if (CARPETAS_IGNORADAS.has(entrada.name)) continue;
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) yield* archivosJS(ruta);
    else if (EXTENSIONES.test(entrada.name)) yield ruta;
  }
}

let errores = 0;
let revisados = 0;
for (const archivo of archivosJS(RAIZ)) {
  revisados += 1;
  try {
    execFileSync(process.execPath, ['--check', archivo], { stdio: 'pipe' });
  } catch (error) {
    errores += 1;
    console.error(`❌ ${relative(RAIZ, archivo)}\n${error.stderr}`);
  }
}

console.log(`${revisados} archivos revisados · ${errores} con errores`); // calidad-ignorar: resultado del comando
process.exitCode = errores > 0 ? 1 : 0;
