# Tests E2E (Playwright)

Sprint 7 — pruebas end-to-end reales contra la app corriendo, no unidades
mockeadas. Viven solo acá (`frontend/e2e/`); el backend no tiene tests E2E
propios porque estos manejan el flujo completo browser -> frontend -> backend
-> DB.

## Antes de correr los tests

1. **Levantar el backend a mano, en otra terminal**, contra la base de datos
   real de desarrollo (`backend/.env` con `DATABASE_URL` configurado):

   ```
   cd backend
   npm run dev
   ```

2. Correr los tests desde `frontend/`:

   ```
   npm run test:e2e
   ```

   Esto levanta el frontend automáticamente (`playwright.config.js`'s
   `webServer`, `npm run dev` en este mismo directorio, puerto 5173) y lo
   apaga al terminar. El backend **no** se auto-levanta — ver la próxima
   sección.

   `npm run test:e2e` es `playwright test --project=chromium`
   (`package.json`) — el proyecto `chromium` es la suite de flujo, ver
   "Estructura" abajo. El `--project` es explícito a propósito: Playwright
   corre TODOS los proyectos configurados cuando no se le pasa ninguno, así
   que sin ese flag `npm run test:e2e` también dispararía el proyecto
   `mobile` en cada corrida de rutina — sembrando sus fixtures y gastando un
   login de más contra el rate limit de 8/15min sin que nadie lo pidiera. El
   proyecto `mobile` tiene su propio script — ver la sección siguiente.

## Proyecto `mobile` (layout responsive del admin)

`playwright.config.js` define **dos proyectos**, no uno: `chromium` (1280x720,
`devices["Desktop Chrome"]`, la suite de flujo de siempre) y `mobile` (Pixel 7
= 412x915, `devices["Pixel 7"]` — sigue siendo Chromium con `isMobile`/
`hasTouch`, no exige instalar WebKit). Cada proyecto corre un subconjunto
disjunto de specs (`testMatch`/`testIgnore` en la config): `mobile` corre
**solo** `admin-mobile.spec.js`, `chromium` corre todo lo demás.

```
cd frontend
npm run test:e2e:mobile
```

Equivalente a `playwright test --project=mobile` (`package.json`). Correr
`npx playwright test` a mano, sin `--project` ni ninguno de los dos scripts
de `package.json`, sigue disparando los DOS proyectos — es el comportamiento
por defecto de Playwright con `projects` múltiples, no algo que la config
pueda desactivar; los scripts de `package.json` son la forma de elegir uno
solo sin tener que acordarse del flag.

**Por qué `mobile` corre un único spec y no la suite entera**: los otros 8
specs (6 de flujo — 5 públicos más `admin-cambio-estado.spec.js`, que es del
panel — más `admin-desktop-layout.spec.js` y `admin-tablero-ordenes.spec.js`)
prueban
*comportamiento* (checkout, login, cambio de estado de una orden, que la
tabla siga siendo `display: table` en escritorio) — ese comportamiento ya
está cubierto contra 1280px, y correrlo de nuevo a 412px no agrega cobertura
nueva, solo duplica tiempo de corrida y gasta rate limit (login 8/15min,
`POST /api/ordenes` 10/10min) sin verificar nada que el proyecto `chromium`
no verifique ya. Lo que sí es específico de un viewport angosto es el
**layout**: desborde horizontal, tabla apilada, áreas táctiles, el drawer —
exactamente lo que prueba `admin-mobile.spec.js`.

Qué verifica cada spec nuevo:

- **`admin-mobile.spec.js`** (proyecto `mobile`): siembra un admin + un
  producto + una orden de test en `beforeAll` (ver "Estrategia de datos de
  test" abajo) y corre cinco tests contra el admin logueado:
  1. **Ninguna pantalla desborda ni tapa el título** — recorre las dieciocho
     rutas del admin (listados, detalle de orden, editor de producto, importar
     y actualizar por Excel, salud del catálogo, pantallas de configuración y
     las cuatro de analytics) y en cada una mide
     `document.documentElement.scrollWidth` contra `window.innerWidth` **y**
     el `getBoundingClientRect().right` de cada `<table>`/`<tr>` (el
     `overflow-x-clip` del `<main>` del admin recorta el desborde sin
     convertirlo en scroll de documento, así que el primer chequeo solo no
     alcanza), más que el `<h1>` de cada pantalla no quede tapado por el
     botón "Abrir menú" de la barra superior.
  2. **Drawer**: abre con el botón de la barra superior, `Escape` lo cierra
     (`inert` vuelve a `true`, sale de pantalla) y el foco vuelve al botón
     que lo abrió.
  3. **Tabla apilada conserva semántica**: en `/productos`, la tabla sigue
     siendo `role="table"` con `display: block`, sus celdas siguen siendo
     `role="cell"` con nombre accesible, y el `thead` (visualmente sr-only en
     mobile) sigue en el árbol de accesibilidad.
  4. **Áreas táctiles**: el primer switch "Catálogo" de la tabla mide al
     menos 24×44 px, y el primer checkbox de selección **de una fila** (el
     "Seleccionar todos" de cabecera es `max-md:hidden` en mobile) tiene un
     área táctil (su `<label>` envolvente) de al menos 44×44 px.
  5. **Un diálogo tapa la barra superior**: con el diálogo de borrado masivo
     abierto en `/productos`, `document.elementFromPoint` sobre el centro del
     botón "Abrir menú" devuelve el backdrop del diálogo y no un nodo del
     `<header>`. Es la medición del contexto de apilamiento de `AdminLayout`
     que jsdom no puede dar (ver "Tabla apilada del admin" en `CLAUDE.md`).
- **`admin-tablero-ordenes.spec.js`** (proyecto `chromium`): el gesto de
  arrastre del tablero Kanban de órdenes, que es lo ÚNICO que Vitest no puede
  cubrir — jsdom no implementa `PointerEvent` ni `setPointerCapture` (el
  `PointerSensor` de dnd-kit no arranca) y devuelve `getBoundingClientRect` en
  cero, así que la detección de colisión resuelve degeneradamente. Verifica el
  arrastre con mouse, el camino de TECLADO (que es por lo que se aceptó sumar
  `@dnd-kit/core`), que cancelar el diálogo no mueva nada, y el panel de
  resumen con Escape. Cada movimiento se confirma **leyendo la fila en la
  base**, no contra la UI.

  ⚠️ **Va entero en UN test con `test.step`, y no es pereza: el login tiene
  rate limit de 8 intentos cada 15 minutos por IP.** Con un login por test,
  este spec solo agotaba casi la mitad del cupo de la corrida y hacía fallar a
  los demás — el primero en caerse fue `admin-cambio-estado.spec.js`, que ni
  siquiera es parte de esa feature. Mismo criterio que `admin-mobile.spec.js`.
  Si al correr la suite completa varios specs fallan con "sigo en
  /catalogo/admin/login", **es el rate limit, no el código**: esperar 15
  minutos.

  Nota de Playwright: `page.dragAndDrop` falla seguido contra dnd-kit porque
  manda un solo movimiento y no supera la `activationConstraint` de 8 px. Hay
  que usar `mouse.move` → `down` → `move(..., { steps })` → `up`.

  ⚠️ **Dos carreras que hay que respetar en cualquier test de este tablero, y
  las dos son intermitentes:**

  - **Levantar con `Space` NO es sincrónico.** Una flecha que llega antes se
    procesa como si no hubiera arrastre: el `Space` final suelta sobre la MISMA
    columna y no pasa nada, sin error. Hay que esperar a que aparezca el clon
    del `DragOverlay` (`[data-tarjeta-orden][aria-hidden="true"]`), que existe
    solo mientras dura el gesto. El anuncio del `aria-live` **no** sirve:
    conserva el texto del arrastre anterior, así que la espera pasa de
    inmediato.
  - **Ver la tarjeta en la columna destino NO prueba que el PATCH terminó.**
    Con el diálogo abierto la tarjeta ya se dibuja ahí (la previsualización que
    evita verla "volver" detrás del modal), así que esa aserción pasa antes de
    que se escriba nada. La señal de que el movimiento se persistió es que **el
    diálogo se cerró**; leer la base antes devuelve el estado viejo.

  Y en mobile, `getByRole("dialog")` pelado rompe por strict mode: el drawer
  del menú también es un `dialog` (montado e inerte). Acotar por nombre.
- **`admin-desktop-layout.spec.js`** (proyecto `chromium`): guard de
  no-regresión — a 1280x720 la tabla de `/productos` sigue siendo
  `display: table` (no apilada), el botón "Abrir menú" sigue oculto, el
  drawer sigue `inert` (nunca se abrió) y el link "Ventas" de la bottom nav
  sigue visible en la franja inferior de la pantalla.

## Por qué el backend no se auto-levanta

Playwright's `webServer` solo soporta arrancar un proceso directamente. Se
evaluó envolver el arranque de los dos servidores (frontend + backend) en un
script wrapper, pero se descartó por sobre-ingeniería para el tamaño de este
proyecto: el backend depende de una conexión real a SQL Server que ya tiene
que estar corriendo en desarrollo de todos modos (el contenedor Docker
compartido del equipo) — no hay nada "efímero" que levantar y bajar ahí, a
diferencia del frontend, que es un dev server stateless.

Si el backend no está arriba cuando corrés `npm run test:e2e`, los tests
fallan rápido con un error de conexión claro (`fetch failed` /
`ECONNREFUSED` contra `http://localhost:4000`), no con un timeout ambiguo.

## Estrategia de datos de test

Los tests corren contra la **misma base de datos de desarrollo** que usa el
backend real — no hay una base de datos de test separada ni un container
aparte. Para no ensuciar los datos reales de dev:

- Todo dato creado por un test lleva el prefijo `E2E-TEST-` en un campo
  identificable (`Product.sku`, `Cliente.nombre`).
- `Cliente.dni` no puede llevar el prefijo (el campo es numérico, 7-8
  dígitos), así que usa un rango sintético reservado (`00` + 6 dígitos del
  timestamp) — ver `crearDniDeTest()` en `helpers/db.js`.
- Cada test limpia sus propias filas en `afterEach` (`helpers/db.js`),
  respetando el orden que exige el schema: `Orden` antes que `Cliente`
  (`Cliente -> Orden` es `onDelete: NoAction`, no cascade).
- `limpiarTodoRastroDeTest()` en `helpers/db.js` es una red de seguridad
  adicional por si un test crashea antes de su propio cleanup — barre
  cualquier fila con el prefijo `E2E-TEST-` que haya quedado huérfana.

Ver `helpers/db.js` para el detalle completo y reutilizar el mismo patrón de
seed/cleanup en escenarios nuevos (Sprint 7 Task 2).

## Estructura

- `helpers/db.js` — seed/cleanup de datos de test vía Prisma directo
  (import de `backend/src/lib/prisma.js` — los tests de Playwright corren en
  Node, así que esto es acceso directo a DB legítimo, sin pasar por HTTP).
  Incluye tanto helpers de creación (`crearProductoDeTest`,
  `crearClienteDeTest`, `crearOrdenDeTest`, `crearUsuarioAdminDeTest`) como
  de borrado (`borrarProductoDeTest`, `borrarOrdenDeTest`,
  `borrarUsuarioAdminDeTest`, `limpiarTodoRastroDeTest`).
- `flujo-feliz.spec.js` — Escenario 1: catálogo -> detalle -> carrito ->
  checkout -> confirmación, con verificación final directa en la DB.
- `cliente-recurrente.spec.js` — Escenario 2: dos órdenes con el mismo dni
  (una sembrada, una por checkout real de UI) resuelven a un único `Cliente`.
- `producto-agotado.spec.js` — Escenario 3: badge "Agotado" + CTA
  deshabilitado en la UI, más defensa en profundidad verificando que
  `POST /api/ordenes` también rechaza el producto server-side.
- `whatsapp-detalle.spec.js` — Escenario 4: el botón de WhatsApp arma el link
  esperado (número real desde `GET /api/config/whatsapp`, mensaje con el
  nombre del producto) sin navegar de verdad a wa.me. Se salta
  (`test.skip`) si `WHATSAPP_NUMERO` no está configurado en el `.env` del
  backend local — es una variable de entorno, no algo que el test pueda
  sembrar.
- `admin-cambio-estado.spec.js` — Escenario 5: login real de admin -> cambiar
  el estado de una orden por UI -> reload -> el estado persiste (verificado
  también directo en la DB).
- `checkout-accesibilidad.spec.js` — pasada de accesibilidad sobre el
  formulario de checkout: labels asociados, `aria-invalid`/
  `aria-describedby` en campos inválidos, `role="alert"` en errores de envío
  (fixes del Sprint 6, confirmados bajo render real de browser).
- `global-setup.js` — pre-flight check: falla rápido y con un mensaje claro
  si el backend no responde en `http://localhost:4000/health` antes de
  arrancar los tests, en vez de dejar que el primer test falle por timeout.
- `global-teardown.js` — red de seguridad final: corre
  `limpiarTodoRastroDeTest()` al terminar toda la corrida.

## Envío de correo real en cada corrida

Desde la feature de notificaciones por email, el backend **no arranca** sin
`SMTP_USER`, `SMTP_PASSWORD` y `MAIL_ADMIN_DESTINO` configuradas en
`backend/.env` (ver "Arranque, seguridad y apagado del backend" en
`CLAUDE.md`) — así que sin esas tres variables la suite E2E directamente no
corre, porque el backend levantado a mano en el paso previo no levanta.

Con ellas configuradas, `flujo-feliz.spec.js` y `cliente-recurrente.spec.js`
crean órdenes de verdad, y cada orden real dispara `notificarOrdenCreada`:
**dos correos REALES por corrida**, uno a `MAIL_ADMIN_DESTINO` y otro a la
dirección del cliente de prueba.

Las direcciones de los clientes de prueba usan el dominio `@example.com`,
que no tiene registro MX — eso genera **rebotes duros** en cada corrida, y
los rebotes duros repetidos castigan la reputación de envío de la cuenta de
Gmail configurada. Esto es una consecuencia conocida y aceptada del diseño
(la suite valida el flujo de notificación real, no un mock), no un bug a
arreglar acá.

**Recomendación**: mientras se corre esta suite, apuntar `MAIL_ADMIN_DESTINO`
a una casilla de pruebas propia — no a la casilla de producción de YIMA.

## Rate limiting y corridas repetidas

`POST /api/ordenes` está limitado a 10 requests/10min por IP (ver
`ordenes.routes.js`). La suite completa dispara ~3 POST reales por corrida
(flujo-feliz, cliente-recurrente, la defensa en profundidad de
producto-agotado). Correr la suite 3 veces seguidas está cómodo bajo el
límite (~9 de 10), pero corridas manuales repetidas EN EL MEDIO (debugging,
`npx playwright test` sueltos) sí pueden gatillar un 429 real — el store del
limitador es en memoria por proceso (`rateLimit.middleware.js`), así que
reiniciar el backend local resetea el contador si hace falta desbloquear una
corrida de verificación.
