import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularEstadisticas } from '../frontend/js/componentes/estadisticas.js';
import { filtrarTareas } from '../frontend/js/componentes/tabla-tareas.js';
import { insigniaEstado, insigniaPrioridad } from '../frontend/js/componentes/ui/insignia.js';
import { avatar } from '../frontend/js/componentes/ui/avatar.js';

const TAREAS = [
  { titulo: 'Diseñar dashboard', descripcion: 'Tarjetas y tabla', responsable: 'Laura Méndez', estado: 'completada' },
  { titulo: 'Base de datos', descripcion: '', responsable: 'Diego Ramos', estado: 'en_progreso' },
  { titulo: 'Integrar calendario', descripcion: 'Google', responsable: 'Laura Méndez', estado: 'pendiente' },
  { titulo: 'Documentación', descripcion: 'README', responsable: 'Ana Torres', estado: 'pendiente' },
];

test('calcularEstadisticas cuenta por estado', () => {
  assert.deepEqual(calcularEstadisticas(TAREAS), { total: 4, pendiente: 2, en_progreso: 1, completada: 1 });
  assert.deepEqual(calcularEstadisticas([]), { total: 0, pendiente: 0, en_progreso: 0, completada: 0 });
});

test('calcularEstadisticas ignora estados desconocidos', () => {
  const resultado = calcularEstadisticas([{ estado: 'total' }, { estado: 'constructor' }, { estado: 'pendiente' }]);
  assert.deepEqual(resultado, { total: 3, pendiente: 1, en_progreso: 0, completada: 0 });
});

test('filtrarTareas por estado', () => {
  assert.equal(filtrarTareas(TAREAS, { estado: 'pendiente' }).length, 2);
  assert.equal(filtrarTareas(TAREAS, { estado: 'todas' }).length, 4);
  assert.equal(filtrarTareas(TAREAS).length, 4);
});

test('filtrarTareas busca en título, descripción y responsable sin distinguir mayúsculas', () => {
  assert.equal(filtrarTareas(TAREAS, { busqueda: 'LAURA' }).length, 2);
  assert.equal(filtrarTareas(TAREAS, { busqueda: 'google' }).length, 1);
  assert.equal(filtrarTareas(TAREAS, { busqueda: '  readme ' }).length, 1);
  assert.equal(filtrarTareas(TAREAS, { busqueda: 'zzz' }).length, 0);
});

test('filtrarTareas combina estado y búsqueda', () => {
  assert.equal(filtrarTareas(TAREAS, { estado: 'pendiente', busqueda: 'laura' }).length, 1);
});

test('insignias generan la clase y la etiqueta correctas', () => {
  assert.equal(String(insigniaPrioridad('alta')), '<span class="insignia insignia--alta">Alta</span>');
  assert.equal(String(insigniaEstado('en_progreso')), '<span class="insignia insignia--en_progreso">En progreso</span>');
});

test('avatar muestra las iniciales escapadas', () => {
  assert.equal(String(avatar('María José')), '<span class="avatar" aria-hidden="true">MJ</span>');
  assert.equal(String(avatar('<x> y')), '<span class="avatar" aria-hidden="true">&lt;Y</span>');
});
