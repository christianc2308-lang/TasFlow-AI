/**
 * Configuración del backend leída de las variables de entorno.
 *
 * Se lee en el momento de usarla (no al importar el módulo), así funciona
 * aunque dotenv se cargue después de los imports. Si falta una variable
 * obligatoria, el error dice exactamente cuál.
 */

function leerObligatorias(nombres) {
  const faltan = nombres.filter((nombre) => !process.env[nombre]);
  if (faltan.length > 0) {
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}. Revisa backend/.env (plantilla en .env.example).`);
  }
  return Object.fromEntries(nombres.map((nombre) => [nombre, process.env[nombre]]));
}

/** Credenciales OAuth de Google Cloud Console. */
export function obtenerConfigGoogle() {
  const variables = leerObligatorias(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI']);
  return {
    clientId: variables.GOOGLE_CLIENT_ID,
    clientSecret: variables.GOOGLE_CLIENT_SECRET,
    redirectUri: variables.GOOGLE_REDIRECT_URI,
  };
}

/** URL pública de TaskFlow AI (opcional): se usa para enlazar a una tarea. */
export function obtenerUrlApp() {
  return process.env.APP_URL || null;
}
