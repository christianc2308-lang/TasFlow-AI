import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerTareas, agregarTarea, suscribirse } from '../frontend/js/estado/tareas-store.js';

const DATOS = { titulo: 'Nueva', responsable: 'Ana', prioridad: 'media', estado: 'pendiente', fechaLimite: '2026-12-01' };

test('empieza con las tareas de ejemplo', () => {
  assert.ok(obtenerTareas().length > 0);
});

test('agregarTarea asigna un id nuevo y la coloca primero', () => {
  const antes = obtenerTareas();
  const creada = agregarTarea(DATOS);
  const despues = obtenerTareas();

  assert.equal(despues.length, antes.length + 1);
  assert.equal(despues[0].id, creada.id);
  assert.ok(!antes.some((tarea) => tarea.id === creada.id));
  assert.equal(creada.descripcion, '');
});

test('agregarTarea ignora un id recibido en los datos (no hay ids duplicados)', () => {
  const creada = agregarTarea({ ...DATOS, id: 1 });
  const ids = obtenerTareas().map((tarea) => tarea.id);
  assert.notEqual(creada.id, 1);
  assert.equal(new Set(ids).size, ids.length);
});

test('obtenerTareas devuelve copias: modificarlas no altera el almacén', () => {
  const copia = obtenerTareas();
  copia[0].titulo = 'Modificado desde fuera';
  assert.notEqual(obtenerTareas()[0].titulo, 'Modificado desde fuera');
});

test('suscribirse avisa en cada cambio y se puede cancelar', () => {
  let avisos = 0;
  const cancelar = suscribirse(() => { avisos += 1; });
  agregarTarea(DATOS);
  assert.equal(avisos, 1);
  cancelar();
  agregarTarea(DATOS);
  assert.equal(avisos, 1);
});
