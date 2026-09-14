/**
 * Cargador del chunk de `MisPedidos`, para el `lazy()` de `App.jsx` y la
 * precarga desde `MiCuenta.jsx`.
 *
 * Mismo patrón (y mismo motivo) que `components/cargarRequireAuthCliente.js`:
 * precargar el chunk NO alcanza, porque `React.lazy` igual suspende un
 * render —su promesa se resuelve en un microtask— y React sostiene el
 * fallback de Suspense ~300 ms. Por eso, una vez cargado, `cargarMisPedidos`
 * devuelve un thenable SINCRÓNICO: el primer "Mis pedidos" desde `/cuenta` no
 * pinta el spinner del guard (comparten el mismo `<Suspense>` en `App.jsx`).
 */
let modulo = null;
let promesa = null;

function importar() {
  if (!promesa) {
    promesa = import("./MisPedidos.jsx").then(
      (cargado) => {
        modulo = cargado;
        return cargado;
      },
      (error) => {
        // Un fallo de red no puede quedar cacheado: el próximo intento reimporta.
        promesa = null;
        throw error;
      },
    );
  }
  return promesa;
}

/** Para `lazy()`: sincrónico si ya se cargó, la promesa del import si no. */
export function cargarMisPedidos() {
  if (modulo) return { then: (resolver) => resolver(modulo) };
  return importar();
}

/** Fire-and-forget: nunca rechaza; un fallo solo deja el lazy como estaba. */
export function precargarMisPedidos() {
  return importar().catch(() => undefined);
}
