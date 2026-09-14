/**
 * Cargador del chunk de `PedidoDetalle`, para el `lazy()` de `App.jsx` y la
 * precarga desde `MisPedidos.jsx`.
 *
 * Mismo patrón (y mismo motivo) que `cargarMisPedidos.js`: precargar el chunk
 * NO alcanza, porque `React.lazy` igual suspende un render y React sostiene el
 * fallback de Suspense ~300 ms. Una vez cargado, `cargarPedidoDetalle` devuelve
 * un thenable SINCRÓNICO: abrir un pedido desde el listado no pinta el spinner
 * del guard (comparten el mismo `<Suspense>` en `App.jsx`).
 */
let modulo = null;
let promesa = null;

function importar() {
  if (!promesa) {
    promesa = import("./PedidoDetalle.jsx").then(
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
export function cargarPedidoDetalle() {
  if (modulo) return { then: (resolver) => resolver(modulo) };
  return importar();
}

/** Fire-and-forget: nunca rechaza; un fallo solo deja el lazy como estaba. */
export function precargarPedidoDetalle() {
  return importar().catch(() => undefined);
}
