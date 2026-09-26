// Servidor de desarrollo de TaskFlow AI (sin dependencias).
// Uso: npm run dev  (o: node tools/servidor.mjs)  →  http://localhost:8080
//
//   /                 → frontend/   (la aplicación)
//   /herramientas/    → tools/      (páginas de prueba, p. ej. prueba-n8n.html)
//
// Hace falta porque el navegador no carga módulos JavaScript (type="module")
// al abrir index.html con doble clic (file://).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUERTO = Number(process.env.PORT) || 8080;
const carpeta = (ruta) => resolve(fileURLToPath(new URL(ruta, import.meta.url)));

const RAICES = [
  { prefijo: '/herramientas/', carpeta: carpeta('.') },
  { prefijo: '/', carpeta: carpeta('../frontend') },
];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function responder(respuesta, codigo, texto) {
  respuesta.writeHead(codigo, { 'Content-Type': 'text/plain; charset=utf-8' }).end(texto);
}

/** Traduce la URL pedida a un archivo del disco, o null si no está permitido. */
function resolverArchivo(url) {
  const ruta = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const { prefijo, carpeta: raiz } = RAICES.find((r) => ruta.startsWith(r.prefijo));
  const relativa = ruta.slice(prefijo.length);
  const archivo = normalize(join(raiz, relativa.endsWith('/') || !relativa ? `${relativa}index.html` : relativa));

  // Impide salir de la carpeta permitida (p. ej. /../backend/.env)
  return archivo.startsWith(raiz + sep) ? archivo : null;
}

createServer(async (peticion, respuesta) => {
  let archivo;
  try {
    archivo = resolverArchivo(peticion.url);
  } catch {
    responder(respuesta, 400, 'URL no válida'); // p. ej. %E0%A4%A mal codificado
    return;
  }

  if (!archivo) {
    responder(respuesta, 403, 'Prohibido');
    return;
  }

  try {
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    respuesta.end(contenido);
  } catch {
    responder(respuesta, 404, 'No encontrado');
  }
}).listen(PUERTO, () => {
  console.log(`TaskFlow AI disponible en http://localhost:${PUERTO}`); // calidad-ignorar: mensaje de arranque
});
