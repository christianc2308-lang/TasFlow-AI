import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diasDesdeHoy, hoyISO, formatearFecha, estaVencida, iniciales, pluralizar,
} from '../frontend/js/utils/formato.js';

test('hoyISO devuelve la fecha local en formato YYYY-MM-DD', () => {
  const ahora = new Date();
  const esperado = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  assert.equal(hoyISO(), esperado);
});

test('diasDesdeHoy(0) es hoy y maneja cambios de mes', () => {
  assert.equal(diasDesdeHoy(0), hoyISO());
  assert.match(diasDesdeHoy(40), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(diasDesdeHoy(1) > hoyISO());
  assert.ok(diasDesdeHoy(-1) < hoyISO());
});

test('formatearFecha muestra la fecha en español', () => {
  assert.equal(formatearFecha('2026-10-10'), '10 oct 2026');
  assert.equal(formatearFecha('2026-01-05'), '05 ene 2026');
});

test('formatearFecha no lanza errores con fechas inválidas', () => {
  for (const valor of ['no-es-fecha', '', null, undefined, '2026-13-45x']) {
    assert.equal(formatearFecha(valor), 'Fecha no válida');
  }
});

test('estaVencida solo marca tareas no completadas con fecha pasada', () => {
  const hoy = '2026-09-26';
  assert.equal(estaVencida({ estado: 'pendiente', fechaLimite: '2026-09-25' }, hoy), true);
  assert.equal(estaVencida({ estado: 'pendiente', fechaLimite: '2026-09-26' }, hoy), false);
  assert.equal(estaVencida({ estado: 'completada', fechaLimite: '2020-01-01' }, hoy), false);
});

test('iniciales toma la primera letra de hasta dos palabras', () => {
  assert.equal(iniciales('Christian Castro'), 'CC');
  assert.equal(iniciales('  maría  josé  pérez '), 'MJ');
  assert.equal(iniciales('Ana'), 'A');
});

test('pluralizar usa singular solo para 1', () => {
  assert.equal(pluralizar(1, 'tarea'), '1 tarea');
  assert.equal(pluralizar(0, 'tarea'), '0 tareas');
  assert.equal(pluralizar(3, 'mes', 'meses'), '3 meses');
});
