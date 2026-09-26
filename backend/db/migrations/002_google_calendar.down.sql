-- =====================================================================
-- Reversión de la migración 002: elimina la integración con Google Calendar.
-- Los eventos ya creados en Google Calendar NO se borran; solo se pierde
-- el vínculo con TaskFlow.
-- =====================================================================

BEGIN;

DROP INDEX IF EXISTS idx_tareas_pendientes_sincronizar;
DROP INDEX IF EXISTS idx_tareas_google_event_id;

ALTER TABLE tareas
    DROP COLUMN IF EXISTS sincronizado_en,
    DROP COLUMN IF EXISTS google_event_id;

DROP TABLE IF EXISTS conexiones_google;

COMMIT;
