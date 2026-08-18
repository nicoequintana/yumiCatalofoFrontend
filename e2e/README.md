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
- `flujo-feliz.spec.js` — Escenario 1: catálogo -> detalle -> carrito ->
  checkout -> confirmación, con verificación final directa en la DB.
