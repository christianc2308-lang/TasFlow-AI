-- =====================================================================
-- Migración 002: integración con Google Calendar
-- Motor: PostgreSQL 13+
-- Requiere: 001 (esquema inicial con las tablas usuarios y tareas)
-- Reversión: 002_google_calendar.down.sql
--
-- Cada tarea con fecha límite se sincroniza como un evento de día completo
-- en el Google Calendar del usuario asignado (o del creador si no hay
-- asignado). Por eso cada tarea guarda un único google_event_id.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Conexión OAuth de cada usuario con su cuenta de Google.
-- Un usuario solo puede tener una conexión activa.
-- ---------------------------------------------------------------------
CREATE TABLE conexiones_google (
    id                     SERIAL        PRIMARY KEY,
    usuario_id             INT           NOT NULL UNIQUE
                                         REFERENCES usuarios (id) ON DELETE CASCADE,
    google_email           VARCHAR(150),
    -- Cifrado en la aplicación (AES-256-GCM) antes de guardarlo; nunca en texto plano.
    refresh_token_cifrado  TEXT          NOT NULL,
    calendario_id          VARCHAR(255)  NOT NULL DEFAULT 'primary',
    estado                 VARCHAR(10)   NOT NULL DEFAULT 'activa'
                                         CHECK (estado IN ('activa', 'caducada')),
    conectado_en           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en         TIMESTAMPTZ
);

COMMENT ON TABLE  conexiones_google IS 'Cuentas de Google Calendar conectadas por OAuth 2.0';
COMMENT ON COLUMN conexiones_google.estado IS 'caducada = el usuario revocó el permiso o el token expiró; hay que pedir reconexión';

-- ---------------------------------------------------------------------
-- Vínculo entre cada tarea y su evento en Google Calendar.
-- ---------------------------------------------------------------------
ALTER TABLE tareas
    ADD COLUMN google_event_id  VARCHAR(255),
    ADD COLUMN sincronizado_en  TIMESTAMPTZ;

COMMENT ON COLUMN tareas.google_event_id IS 'ID del evento en Google Calendar; NULL si la tarea no está sincronizada';
COMMENT ON COLUMN tareas.sincronizado_en IS 'Última sincronización correcta con Google Calendar';

-- Buscar la tarea a partir de un evento (por ejemplo, al limpiar eventos borrados en Google).
CREATE INDEX idx_tareas_google_event_id
    ON tareas (google_event_id)
    WHERE google_event_id IS NOT NULL;

-- Encontrar tareas con fecha límite pendientes de sincronizar (reintentos).
CREATE INDEX idx_tareas_pendientes_sincronizar
    ON tareas (actualizado_en)
    WHERE fecha_limite IS NOT NULL
      AND (sincronizado_en IS NULL OR sincronizado_en < actualizado_en);

COMMIT;
