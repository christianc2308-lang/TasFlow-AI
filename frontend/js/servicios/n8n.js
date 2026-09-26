/**
 * Comunicación con los webhooks de n8n.
 * Mientras pruebas en el editor de n8n usa la URL de test (/webhook-test/...);
 * con el workflow activo usa la de producción (/webhook/...).
 */

export const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/nueva-tarea';

/**
 * Envía datos en JSON a un webhook de n8n y devuelve su respuesta.
 * Lanza un Error si n8n responde con un código de error, y un TypeError
 * si no se puede conectar: quien llama decide cómo mostrarlo.
 */
export async function enviarAN8n(datos, url = N8N_WEBHOOK_URL) {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });

  const texto = await respuesta.text();
  let cuerpo;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    cuerpo = texto; // n8n puede responder con texto plano
  }

  if (!respuesta.ok) {
    const detalle = typeof cuerpo === 'object' && cuerpo?.message ? cuerpo.message : texto;
    throw new Error(`n8n respondió con el código ${respuesta.status}: ${detalle}`);
  }
  return cuerpo;
}

/**
 * Avisa a n8n de que se ha creado una tarea.
 * Devuelve la respuesta de n8n ({ exito, mensaje, tarea, fecha }) o null si falla,
 * sin interrumpir el funcionamiento de la app.
 */
export async function enviarTareaAN8n(titulo, prioridad) {
  try {
    return await enviarAN8n({ titulo, prioridad });
  } catch (error) {
    console.error('No se pudo enviar la tarea a n8n:', error.message);
    return null;
  }
}
