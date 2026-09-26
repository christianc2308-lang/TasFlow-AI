import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escaparHTML, html, htmlDeConfianza } from '../frontend/js/utils/dom.js';

test('escaparHTML neutraliza los caracteres especiales', () => {
  assert.equal(escaparHTML('<img src=x onerror="robar()">'), '&lt;img src=x onerror=&quot;robar()&quot;&gt;');
  assert.equal(escaparHTML("O'Brien & Co"), 'O&#39;Brien &amp; Co');
  assert.equal(escaparHTML(42), '42');
});

test('html`` escapa todos los valores interpolados, también en atributos', () => {
  const titulo = '<script>robar()</script>';
  const fecha = '"><img src=x onerror=robar()>';
  const resultado = String(html`<td title="${titulo}"><time datetime="${fecha}">${titulo}</time></td>`);
  assert.ok(!resultado.includes('<script>'));
  assert.ok(!resultado.includes('"><img'));
  assert.ok(resultado.includes('&lt;script&gt;'));
});

test('html`` anida plantillas sin escaparlas dos veces', () => {
  const interior = html`<b>${'a & b'}</b>`;
  assert.equal(String(html`<p>${interior}</p>`), '<p><b>a &amp; b</b></p>');
});

test('html`` une arrays y omite false, null y undefined', () => {
  const items = ['uno', '<dos>'].map((texto) => html`<li>${texto}</li>`);
  assert.equal(String(html`<ul>${items}</ul>`), '<ul><li>uno</li><li>&lt;dos&gt;</li></ul>');
  assert.equal(String(html`${false}${null}${undefined}${0}`), '0');
});

test('htmlDeConfianza inserta HTML propio sin escapar', () => {
  const icono = htmlDeConfianza('<svg></svg>');
  assert.equal(String(html`<span>${icono}</span>`), '<span><svg></svg></span>');
});
