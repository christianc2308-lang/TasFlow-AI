# TaskFlow AI

Aplicación web para administrar tareas personales y de equipos de trabajo.
Proyecto desarrollado durante el curso de Claude Code.

> **Versión 0.1**: interfaz del dashboard en HTML5, CSS3 y JavaScript.
> Todavía sin autenticación, base de datos ni backend; las tareas se guardan en memoria y se reinician al recargar la página.

## Funcionalidades

- Dashboard con saludo y fecha del día
- Barra lateral de navegación (menú desplegable en tablet y móvil)
- Encabezado con buscador de tareas
- Tarjetas de estadísticas: totales, pendientes, en progreso y completadas
- Tabla de tareas con filtros por estado; se convierte en tarjetas en móvil
- Botón **Nueva tarea** con formulario validado en un modal
- Diseño responsive y modo oscuro automático según el sistema

## Cómo ejecutarlo

Requiere [Node.js](https://nodejs.org) 20 o superior (solo para el servidor de desarrollo; el proyecto no tiene dependencias).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca la app en http://localhost:8080 |
| `npm test` | Ejecuta las pruebas automáticas (`tests/`) |
| `npm run check` | Comprueba la sintaxis de todos los archivos JavaScript |

Con el servidor en marcha, la página de prueba del webhook de n8n está en http://localhost:8080/herramientas/prueba-n8n.html.

> No abras `index.html` con doble clic: los navegadores bloquean los módulos de JavaScript (`type="module"`) cargados desde `file://`.

## Estructura

```
frontend/                       La aplicación (lo único que se publica)
├── index.html
├── css/
│   ├── variables.css           Colores, tipografía y medidas (design tokens)
│   ├── base.css                Reset, tipografía, utilidades y animaciones
│   ├── layout.css              Barra lateral, encabezado y rejilla
│   └── componentes/            Un archivo por componente
│       ├── elementos.css       Botones, avatar, tarjeta, insignias (reutilizables)
│       ├── encabezado.css · estadisticas.css · tabla-tareas.css
│       └── modal.css · notificaciones.css
└── js/
    ├── app.js                  Punto de entrada: conecta datos e interfaz
    ├── config/constantes.js    Estados y prioridades válidos
    ├── datos/tareas-iniciales.js   Datos de ejemplo
    ├── estado/tareas-store.js  Almacén de tareas (único origen de los datos)
    ├── componentes/            Piezas de la interfaz con lógica propia
    │   ├── estadisticas.js · tabla-tareas.js · modal-tarea.js
    │   ├── sidebar.js · notificaciones.js
    │   └── ui/                 Piezas genéricas reutilizables
    │       ├── avatar.js · insignia.js · iconos.js
    ├── servicios/n8n.js        Comunicación con los webhooks de n8n
    └── utils/
        ├── formato.js          Fechas, iniciales, plurales
        └── dom.js              Plantillas html`` seguras y acceso al DOM
backend/                        (en preparación)
├── config.js                   Variables de entorno, validadas al usarse
├── services/calendar.service.js
└── db/migrations/
tests/                          Pruebas automáticas (node --test, sin dependencias)
tools/                          Herramientas de desarrollo (no se publican)
├── servidor.mjs                Servidor local: / → frontend, /herramientas/ → tools
├── prueba-n8n.html             Página para probar el webhook de n8n
└── comprobar-sintaxis.mjs      Usado por npm run check
n8n/workflows/                  Workflows para importar en n8n
.github/workflows/ci.yml        Pruebas automáticas en cada push y Pull Request
.claude/hooks/                  Hook de revisión de calidad para Claude Code
```

## Convenciones

- **Módulos ES** (`import` / `export`): cada archivo tiene una única responsabilidad.
- **Flujo de datos en un solo sentido**: los componentes no modifican las tareas directamente. Llaman a `tareas-store.js`, que avisa a los suscriptores y la vista se vuelve a dibujar.
- **Seguridad**: el HTML se genera con la plantilla `` html`…` `` de `utils/dom.js`, que escapa **todos** los valores por defecto (también en atributos). Solo los iconos propios se marcan con `htmlDeConfianza()`.
- **Componentes reutilizables**: las piezas visuales genéricas (avatar, insignias, iconos) están en `componentes/ui/` y devuelven HTML seguro que se combina en cualquier vista.
- **Pruebas**: cada función pura tiene pruebas en `tests/`; ejecútalas con `npm test` antes de hacer commit.
- **Accesibilidad**: HTML semántico, `<dialog>` nativo, etiquetas en los formularios, `aria-*` en los controles y navegación con teclado.
- **CSS con variables**: los colores y medidas se cambian en `variables.css`; las clases siguen un estilo BEM simplificado (`bloque__elemento`, `bloque--variante`, `is-estado`).

## Próximos pasos

- Editar, eliminar y cambiar el estado de las tareas
- Backend con API REST y base de datos PostgreSQL
- Autenticación de usuarios
- Integración con Google Calendar y automatizaciones con n8n
