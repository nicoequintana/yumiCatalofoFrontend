/**
 * Cargador del chunk de `RequireAuthCliente`, compartido por el `lazy()` de
 * `App.jsx` y la precarga de `Carrito.jsx`.
 *
 * Precargar el chunk NO alcanzaba (medido en navegador, 14/09/2026): con el
 * módulo ya en memoria, `React.lazy` igual suspende un render —su promesa se
 * resuelve en un microtask— y React sostiene el fallback de Suspense ~300 ms
 * (el throttle de revelado). Por eso, una vez cargado, `cargarRequireAuthCliente`
 * devuelve un thenable SINCRÓNICO: el lazy lo resuelve en el mismo render y el
 * primer "Continuar" no pinta el spinner.
 */
let modulo = null;
let promesa = null;

function importar() {
  if (!promesa) {
    promesa = import("./RequireAuthCliente.jsx").then(
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
export function cargarRequireAuthCliente() {
  if (modulo) return { then: (resolver) => resolver(modulo) };
  return importar();
}

/** Fire-and-forget: nunca rechaza; un fallo solo deja el lazy como estaba. */
export function precargarRequireAuthCliente() {
  return importar().catch(() => undefined);
}
