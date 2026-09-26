# Code Review — TaskFlow AI

**Fecha:** 2026-09-26
**Alcance:** proyecto completo (`frontend/`, `backend/`, `scripts/`, `n8n/`, `.claude/hooks/`) — 23 archivos de código, ~2.800 líneas
**Revisor:** Code Reviewer (Claude)

## Resumen ejecutivo

El código está bien organizado para una v0.1: módulos con una responsabilidad clara, flujo de datos en un solo sentido, escapado de HTML y buena accesibilidad de base. El riesgo principal es que **la validación de datos solo existe en la interfaz**: un valor de fecha inválido deja el dashboard roto de forma permanente hasta recargar, y varios campos llegan sin validar al HTML, lo que será un XSS almacenado en cuanto los datos vengan de un backend. El segundo riesgo es de **consistencia entre capas**: frontend, backend y base de datos usan modelos de tarea distintos, y conviene alinearlos antes de construir la API.

Todos los errores marcados como *confirmado* se reprodujeron ejecutando el código (navegador o Node), no solo leyéndolo.

**Total: 22 hallazgos — 🔴 1 · 🟡 12 · 🟢 9**

## Errores de programación

- 🔴 **Alta** — Una fecha con formato inválido rompe el dashboard de forma permanente. *(Confirmado)*
  - **Dónde:** `frontend/js/utils/formato.js:37` (lanza la excepción) y `frontend/js/componentes/modal-tarea.js:16` (no valida el formato).
  - **Por qué importa:** `agregarTarea()` guarda la tarea **antes** de dibujar. Cuando `formatearFecha()` lanza `RangeError: Invalid time value`, la tarea ya está en el almacén, así que **todas** las renderizaciones siguientes fallan (filtros, búsqueda, nuevas tareas) y el modal se queda abierto. Hoy solo ocurre si se manipula el campo desde DevTools, pero con backend bastará un registro mal guardado para dejar la app inservible a todos los usuarios.

- 🟡 **Media** — El servidor de desarrollo se cae con cualquier URL mal codificada. *(Confirmado)*
  - **Dónde:** `scripts/servidor.mjs:27`
  - **Por qué importa:** `decodeURIComponent('/%E0%A4%A')` lanza `URIError` dentro de un callback `async` sin `try/catch`: la promesa rechazada sin capturar **termina el proceso de Node**. Una sola petición (un escáner, un enlace mal copiado) deja de servir la app.

- 🟡 **Media** — El `id` de una tarea nueva se puede sobrescribir y crear duplicados. *(Confirmado)*
  - **Dónde:** `frontend/js/estado/tareas-store.js:32` — `{ id: siguienteId++, descripcion: '', ...datos }`
  - **Por qué importa:** al propagar `datos` **después** de `id`, cualquier `datos.id` gana. Llamando a `agregarTarea({ id: 1, … })` se obtienen dos tareas con `id = 1`. Cuando existan editar y eliminar, la operación afectará a la tarea equivocada.

- 🟡 **Media** — Se aceptan fechas límite en el pasado. *(Confirmado)*
  - **Dónde:** `frontend/index.html:169` (`novalidate`) y `frontend/js/componentes/modal-tarea.js:71`
  - **Por qué importa:** el atributo `min` se asigna, pero `novalidate` desactiva la validación nativa del navegador, y `REGLAS.fechaLimite` solo comprueba que no esté vacía. Se pueden crear tareas que nacen ya vencidas (probado con `2020-01-01`).

- 🟡 **Media** — La validación de prioridad y estado acepta claves heredadas del prototipo. *(Confirmado)*
  - **Dónde:** `frontend/js/componentes/modal-tarea.js:33-34` — `datos.prioridad in PRIORIDADES`
  - **Por qué importa:** el operador `in` recorre la cadena de prototipos, así que `"constructor"` o `"toString"` pasan la validación. Probado: la insignia de prioridad muestra `function Object() { [native code] }` y se genera la clase CSS `insignia--constructor`. Usa `Object.hasOwn(PRIORIDADES, valor)`.

## Problemas de seguridad

- 🟡 **Media** (🔴 en cuanto exista el backend) — Datos insertados en atributos HTML sin escapar.
  - **Dónde:** `frontend/js/componentes/tabla-tareas.js:50`, `:53` (`class="insignia--${…}"`) y `:56` (`datetime="${tarea.fechaLimite}"`)
  - **Por qué importa:** `escaparHTML()` se aplica a los textos, pero no a estos tres valores, que además no se validan (ver errores anteriores). Hoy solo afecta a quien manipula su propio navegador. Cuando las tareas vengan de la API, una `fechaLimite` como `"><img src=x onerror=…>` guardada por un usuario se ejecutará en el navegador de todo su equipo.

- 🟡 **Media** — El webhook de n8n está publicado sin ninguna autenticación.
  - **Dónde:** `n8n/workflows/nueva-tarea.json:12` (`allowedOrigins: "*"`, sin cabecera secreta)
  - **Por qué importa:** cualquier página abierta en el navegador o cualquier equipo de la red puede disparar el workflow. Cuando envíe emails o cree datos, esto permitirá spam o datos falsos. La arquitectura prevé una cabecera `X-Clave-N8N`, pero aún no está implementada.

## Validación de formularios y datos de entrada

- 🟢 **Baja** — Las longitudes máximas solo se imponen en el HTML.
  - **Dónde:** `frontend/js/componentes/modal-tarea.js:10-17` (`REGLAS`); los `maxlength` están en `frontend/index.html`.
  - **Por qué importa:** título (120), responsable (60) y descripción (500) no se comprueban en JS. Hay que repetir estas reglas, y las de formato de fecha y valores permitidos, en el backend cuando exista: la validación del cliente es solo experiencia de usuario.

## Código duplicado o innecesario

- 🟢 **Baja** — La conversión de fecha a `YYYY-MM-DD` está escrita tres veces.
  - **Dónde:** `frontend/js/utils/formato.js:19-24` (`hoyISO`), `frontend/js/utils/formato.js:27-33` (`diasDesdeHoy`) y `backend/services/calendar.service.js:86-92` (`aFechaISO`).
  - **Por qué importa:** `hoyISO()` es exactamente `diasDesdeHoy(0)`. Si se corrige un detalle (por ejemplo, la zona horaria) en una copia, las otras quedan desincronizadas.

- 🟢 **Baja** — `frontend/js/n8n.js` es código muerto, y su lógica está duplicada en la página de prueba.
  - **Dónde:** `frontend/js/n8n.js` (ningún archivo lo importa; tiene un `console.log` en la línea 26) y `frontend/prueba-n8n.html:147` (reimplementa `enviarTareaAN8n` en línea).
  - **Por qué importa:** hay dos versiones de la misma función que ya difieren en el manejo de errores. Además, la URL `localhost:5678` está fija en el código.

- 🟢 **Baja** — `obtenerElemento()` avisa de que falta un elemento pero no evita el fallo.
  - **Dónde:** `frontend/js/utils/dom.js:22-27`
  - **Por qué importa:** devuelve `null` y `app.js` lo usa igualmente, así que el mensaje claro va seguido de un `TypeError` confuso. O lanza un error propio, o se elimina y se usa `getElementById` directamente.

## Rendimiento

- 🟡 **Media** — `calendar.service.js` crea un cliente OAuth nuevo en cada operación.
  - **Dónde:** `backend/services/calendar.service.js:50` (`crearCliente`), llamado en las líneas 131, 141, 156, 167 y 232.
  - **Por qué importa:** un cliente sin access token en caché tiene que canjear el refresh token con Google antes de cada petición. `sincronizarTarea()` de una tarea nueva hace hasta **4 viajes de red** en lugar de 2 (buscar + crear), y al conectar Google con 100 tareas serían cientos de canjes de token, con riesgo de alcanzar los límites de uso. Conviene crear el cliente una vez por conexión y reutilizarlo.

- 🟢 **Baja** — La búsqueda redibuja toda la tabla con cada tecla.
  - **Dónde:** `frontend/js/app.js:55`
  - **Por qué importa:** con 7 tareas no se nota; con cientos, cada pulsación reconstruye todas las filas y llama a `hoyISO()` por cada una. Un *debounce* de 150–200 ms basta cuando crezca.

## Organización de archivos

- 🟡 **Media** — El modelo de tarea es distinto en cada capa.
  - **Dónde:** `frontend/js/datos/tareas-iniciales.js:14` (`responsable: 'Christian C.'`, `fechaLimite`) frente a `backend/services/calendar.service.js` (`fecha_limite`, `google_event_id`) y el diseño de BD (`asignado_id`, 4 estados incluido `en_revision`, frente a 3 en el frontend).
  - **Por qué importa:** el frontend guarda el responsable como texto libre, así que dos "Ana" no se distinguen y no se puede avisar por email. Al conectar la API habrá que traducir campos en cada punto. Hay que decidir el contrato (nombres de campo y valores de estado) **antes** de escribir el backend.

- 🟡 **Media** — La migración `002` depende de una `001` que no existe.
  - **Dónde:** `backend/db/migrations/002_google_calendar.sql`
  - **Por qué importa:** la migración no se puede ejecutar, porque hace `ALTER TABLE tareas` y referencia `usuarios`. Además, la simulación detectó que el diseño previsto para `historial_actividad` (`ON DELETE CASCADE`) borra el historial al eliminar una tarea. Hay que corregirlo al escribir la `001`.

- 🟢 **Baja** — Varios archivos no están donde les corresponde.
  - **Dónde:** `frontend/prueba-n8n.html` (herramienta de desarrollo servida junto a la app), `frontend/js/n8n.js` (servicio suelto en la raíz de `js/`, junto a `app.js`) y `frontend/css/componentes.css` (620 líneas con 10 componentes distintos).
  - **Por qué importa:** la página de prueba se publicaría en producción. `componentes.css` es ya el doble del límite de 300 líneas que marca el propio hook de calidad. Propuesta: `tools/`, `js/servicios/` y un CSS por componente.

## Uso correcto de funciones

- 🟡 **Media** — Las variables de entorno se leen al importar el módulo y no se validan.
  - **Dónde:** `backend/services/calendar.service.js:17`
  - **Por qué importa:** con módulos ES, los `import` se ejecutan antes que el código del archivo que los importa. Si el servidor hace `import dotenv…; dotenv.config()` después de importar este servicio, las cuatro variables serán `undefined` y el fallo aparecerá como un error de OAuth confuso en la primera petición, no al arrancar.

- 🟢 **Baja** — El hook de calidad exporta una función pero se ejecuta al importarlo.
  - **Dónde:** `.claude/hooks/revisar-calidad.mjs:168` (`export function revisarArchivo`) y `:253` (`main()` sin condición).
  - **Por qué importa:** si alguien lo importa para escribirle pruebas, `main()` se quedará esperando datos de stdin. O se quita el `export`, o `main()` se ejecuta solo cuando el archivo se lanza directamente.

## Buenas prácticas

- 🟡 **Media** — No hay pruebas automáticas, linter ni CI.
  - **Dónde:** proyecto completo. No hay `package.json` en la raíz, ni configuración de ESLint o Prettier, ni `.github/workflows/`.
  - **Por qué importa:** los 5 errores confirmados en esta revisión los habría detectado una batería mínima de pruebas unitarias de `formato.js`, `modal-tarea.js` y `tareas-store.js`. Hoy la verificación depende de probar a mano en el navegador.

- 🟡 **Media** — En móvil, la barra lateral oculta sigue siendo accesible con el teclado.
  - **Dónde:** `frontend/js/componentes/sidebar.js:19` (`cerrar()` solo quita una clase) y `frontend/css/layout.css` (se oculta con `transform`).
  - **Por qué importa:** con el menú cerrado, al pulsar Tab el foco entra en 7 enlaces invisibles antes de llegar al contenido. Quien navega con teclado o lector de pantalla se pierde. Se soluciona añadiendo `inert` a la barra lateral cuando está cerrada en móvil.

- 🟢 **Baja** — Detalles menores de la interfaz y de las APIs, agrupados:
  - `frontend/css/componentes.css:489` y `frontend/css/layout.css:87`: colores fijos (`#101828`, `#312e81`, `#fff`…) que no usan los tokens de `variables.css`, por lo que no se adaptan si cambia el tema.
  - `frontend/index.html:34`: los enlaces de navegación son `href="#"` sin función, y al pulsarlos añaden `#` a la URL y suben al inicio. Sería mejor marcarlos como deshabilitados hasta que existan esas vistas.
  - `frontend/index.html:11`: Google Fonts es una dependencia externa; sin conexión o con bloqueadores cambia la tipografía. Valorar alojar la fuente en el proyecto.
  - `backend/services/calendar.service.js:240`: `listarAgenda` pide un máximo de 250 eventos sin paginar y trunca en silencio las agendas muy llenas.

## Prioridades recomendadas

1. **Validar y normalizar los datos en un único punto antes de guardarlos.** Una función `validarTarea()` usada por `tareas-store.js` (y después por la API) que compruebe el formato y el rango de la fecha, use `Object.hasOwn` para prioridad y estado, e ignore cualquier `id` recibido. Esto resuelve el 🔴 y 4 de los 🟡, incluida la raíz del XSS.
2. **Hacer que un fallo de renderizado no rompa la app:** escapar también los atributos (`class`, `datetime`), hacer que `formatearFecha()` devuelva un texto de respaldo ante una fecha inválida, y añadir `try/catch` en `servidor.mjs`.
3. **Definir el contrato de datos de la tarea** (nombres de campo, `asignadoId` en lugar de nombre libre, lista de estados) y escribir la migración `001` corrigiendo el `CASCADE` del historial, antes de empezar el backend.
4. **Añadir una base de calidad automática:** `package.json` en la raíz con `npm test` (pruebas de `formato.js`, `modal-tarea.js` y `tareas-store.js` con el *test runner* de Node, sin dependencias) y un workflow de GitHub Actions que las ejecute en cada PR.
5. **Proteger el webhook de n8n** con una cabecera secreta antes de conectarlo a acciones reales (emails, creación de datos).
