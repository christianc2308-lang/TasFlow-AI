/**
 * calendar.service.js
 * Único módulo de TaskFlow AI que habla con Google Calendar API v3.
 *
 * No accede a la base de datos: recibe la conexión del usuario (con el
 * refresh token YA descifrado) y la tarea, y devuelve lo que hay que guardar.
 * Así el servicio es fácil de probar y la persistencia queda en los repos.
 *
 * Tipos usados:
 *   conexion = { refreshToken: string, calendarioId?: string }
 *   tarea    = { id, titulo, descripcion?, prioridad, estado,
 *                fecha_limite: 'YYYY-MM-DD' | Date | null, google_event_id?: string | null }
 */

import { google } from 'googleapis';
import { obtenerConfigGoogle, obtenerUrlApp } from '../config.js';

// Colores de evento de Google Calendar: 11 Tomate, 6 Mandarina, 7 Pavo real, 2 Salvia.
const COLOR_POR_PRIORIDAD = {
  urgente: '11',
  alta: '6',
  media: '7',
  baja: '2',
};

const RECORDATORIO_MINUTOS = 24 * 60; // aviso un día antes

/**
 * Error con un tipo que el resto de la app puede interpretar sin leer
 * los detalles de Google.
 *   RECONEXION_REQUERIDA → marcar conexiones_google.estado = 'caducada'
 *   NO_ENCONTRADO        → el evento ya no existe en Google
 *   LIMITE_PETICIONES    → reintentar más tarde
 *   DESCONOCIDO          → registrar y reintentar más tarde
 */
export class CalendarError extends Error {
  constructor(tipo, mensaje, causa) {
    super(mensaje);
    this.name = 'CalendarError';
    this.tipo = tipo;
    this.cause = causa;
  }
}

// ---------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------

// Caché de clientes por refresh token. Reutilizar el cliente conserva su
// access token (válido ~1 h), así no se canjea el refresh token con Google
// antes de cada petición. Se limita el tamaño y se descartan los más antiguos.
const MAX_CLIENTES_EN_CACHE = 100;
const clientes = new Map();

function obtenerCalendar(refreshToken) {
  let calendar = clientes.get(refreshToken);
  if (calendar) {
    clientes.delete(refreshToken); // se mueve al final: usado recientemente
  } else {
    const { clientId, clientSecret, redirectUri } = obtenerConfigGoogle();
    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({ refresh_token: refreshToken });
    calendar = google.calendar({ version: 'v3', auth });
    if (clientes.size >= MAX_CLIENTES_EN_CACHE) clientes.delete(clientes.keys().next().value);
  }
  clientes.set(refreshToken, calendar);
  return calendar;
}

function crearCliente(conexion) {
  if (!conexion?.refreshToken) {
    throw new CalendarError('RECONEXION_REQUERIDA', 'El usuario no tiene Google Calendar conectado');
  }
  return {
    calendar: obtenerCalendar(conexion.refreshToken),
    calendarId: conexion.calendarioId || 'primary',
  };
}

function traducirError(err) {
  if (err instanceof CalendarError) return err;

  const status = err.response?.status ?? err.status ?? err.code;
  const detalle = err.response?.data?.error;
  const razon = err.errors?.[0]?.reason ?? err.response?.data?.error?.errors?.[0]?.reason;

  if (detalle === 'invalid_grant' || status === 401) {
    return new CalendarError('RECONEXION_REQUERIDA', 'El permiso de Google Calendar ha caducado o fue revocado', err);
  }
  if (status === 404 || status === 410) {
    return new CalendarError('NO_ENCONTRADO', 'El evento ya no existe en Google Calendar', err);
  }
  if (status === 429 || razon === 'rateLimitExceeded' || razon === 'userRateLimitExceeded') {
    return new CalendarError('LIMITE_PETICIONES', 'Límite de peticiones de Google alcanzado', err);
  }
  return new CalendarError('DESCONOCIDO', `Error de Google Calendar: ${err.message}`, err);
}

// ---------------------------------------------------------------------
// Conversión tarea → evento
// ---------------------------------------------------------------------

/** Normaliza DATE de PostgreSQL (string o Date) a 'YYYY-MM-DD'. */
function aFechaISO(valor) {
  if (valor instanceof Date) {
    // node-postgres convierte DATE en medianoche local: usar los getters locales.
    const m = String(valor.getMonth() + 1).padStart(2, '0');
    const d = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${m}-${d}`;
  }
  return String(valor).slice(0, 10);
}

/** En los eventos de día completo, la fecha de fin es exclusiva: el día siguiente. */
function diaSiguiente(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().slice(0, 10);
}

export function tareaAEvento(tarea) {
  const fecha = aFechaISO(tarea.fecha_limite);
  const completada = tarea.estado === 'completada';
  const urlApp = obtenerUrlApp();
  const enlace = urlApp ? `${urlApp}/tareas/${tarea.id}` : null;

  const descripcion = [tarea.descripcion, enlace && `Ver en TaskFlow AI: ${enlace}`]
    .filter(Boolean)
    .join('\n\n');

  return {
    summary: `${completada ? '✅' : '📋'} ${tarea.titulo}`,
    description: descripcion || undefined,
    start: { date: fecha },
    end: { date: diaSiguiente(fecha) },
    colorId: COLOR_POR_PRIORIDAD[tarea.prioridad] ?? COLOR_POR_PRIORIDAD.media,
    transparency: 'transparent', // no marca al usuario como "ocupado" todo el día
    reminders: completada
      ? { useDefault: false, overrides: [] }
      : { useDefault: false, overrides: [{ method: 'popup', minutes: RECORDATORIO_MINUTOS }] },
    extendedProperties: { private: { taskflowId: String(tarea.id) } },
  };
}

// ---------------------------------------------------------------------
// Operaciones básicas
// ---------------------------------------------------------------------

export async function crearEvento(conexion, tarea) {
  const { calendar, calendarId } = crearCliente(conexion);
  try {
    const { data } = await calendar.events.insert({ calendarId, requestBody: tareaAEvento(tarea) });
    return { googleEventId: data.id, enlace: data.htmlLink };
  } catch (err) {
    throw traducirError(err);
  }
}

export async function actualizarEvento(conexion, tarea) {
  const { calendar, calendarId } = crearCliente(conexion);
  try {
    const { data } = await calendar.events.patch({
      calendarId,
      eventId: tarea.google_event_id,
      requestBody: tareaAEvento(tarea),
    });
    return { googleEventId: data.id, enlace: data.htmlLink };
  } catch (err) {
    throw traducirError(err);
  }
}

/** Borra el evento. Si ya no existía en Google, lo da por borrado. */
export async function eliminarEvento(conexion, googleEventId) {
  const { calendar, calendarId } = crearCliente(conexion);
  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch (err) {
    const error = traducirError(err);
    if (error.tipo !== 'NO_ENCONTRADO') throw error;
  }
}

/** Busca un evento creado antes para esta tarea (evita duplicados si se perdió el google_event_id). */
async function buscarEventoDeTarea(conexion, tareaId) {
  const { calendar, calendarId } = crearCliente(conexion);
  try {
    const { data } = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`taskflowId=${tareaId}`],
      showDeleted: false,
      maxResults: 1,
    });
    return data.items?.[0]?.id ?? null;
  } catch (err) {
    throw traducirError(err);
  }
}

// ---------------------------------------------------------------------
// Sincronización: punto de entrada para tareas.service.js
// ---------------------------------------------------------------------

/**
 * Deja Google Calendar igual que la tarea y devuelve el google_event_id que
 * hay que guardar en la tabla tareas (null = sin evento).
 *
 *   - Sin fecha límite  → borra el evento si existía.
 *   - Con evento previo → lo actualiza (si se borró en Google, lo vuelve a crear).
 *   - Sin evento previo → lo crea, reutilizando uno existente si lo encuentra.
 *
 * @returns {Promise<{ googleEventId: string | null, enlace?: string }>}
 */
export async function sincronizarTarea(conexion, tarea) {
  if (!tarea.fecha_limite) {
    if (tarea.google_event_id) await eliminarEvento(conexion, tarea.google_event_id);
    return { googleEventId: null };
  }

  if (tarea.google_event_id) {
    try {
      return await actualizarEvento(conexion, tarea);
    } catch (err) {
      if (err.tipo !== 'NO_ENCONTRADO') throw err;
      // El usuario borró el evento en Google: se crea de nuevo.
    }
  }

  const existente = await buscarEventoDeTarea(conexion, tarea.id);
  if (existente) {
    return actualizarEvento(conexion, { ...tarea, google_event_id: existente });
  }
  return crearEvento(conexion, tarea);
}

/** Para cuando se borra una tarea en TaskFlow. */
export async function desvincularTarea(conexion, tarea) {
  if (tarea.google_event_id) await eliminarEvento(conexion, tarea.google_event_id);
}

// ---------------------------------------------------------------------
// Lectura de la agenda ("Mi semana")
// ---------------------------------------------------------------------

/**
 * Eventos del usuario entre dos fechas, simplificados para el frontend.
 * @param {Date|string} desde
 * @param {Date|string} hasta
 */
export async function listarAgenda(conexion, desde, hasta) {
  const { calendar, calendarId } = crearCliente(conexion);
  try {
    const { data } = await calendar.events.list({
      calendarId,
      timeMin: new Date(desde).toISOString(),
      timeMax: new Date(hasta).toISOString(),
      singleEvents: true, // expande los eventos recurrentes
      orderBy: 'startTime',
      maxResults: 250,
    });

    return (data.items ?? [])
      .filter((ev) => ev.status !== 'cancelled')
      .map((ev) => ({
        id: ev.id,
        titulo: ev.summary ?? '(Sin título)',
        inicio: ev.start?.dateTime ?? ev.start?.date,
        fin: ev.end?.dateTime ?? ev.end?.date,
        todoElDia: Boolean(ev.start?.date),
        ubicacion: ev.location ?? null,
        enlace: ev.htmlLink,
        tareaId: ev.extendedProperties?.private?.taskflowId ?? null, // no nulo = evento creado por TaskFlow
      }));
  } catch (err) {
    throw traducirError(err);
  }
}
