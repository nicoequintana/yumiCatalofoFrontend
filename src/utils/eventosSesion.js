/**
 * Bus mínimo para avisar "cambió la sesión del cliente" sin que quien lo
 * DETECTA (`api/clienteAuth.js`, ante `SESION_INVALIDA`) tenga que importar a
 * quien REACCIONA (`hooks/usePerfilCliente.js`, invalidando su cache).
 *
 * Ese import directo cerraba un ciclo de módulos: `api/clienteAuth.js` →
 * `hooks/usePerfilCliente.js` → `hooks/usePedidosCliente.js` →
 * `api/cuenta.js` → `api/clienteAuth.js`. La capa de API nunca debe importar
 * hooks; este módulo invierte esa dependencia sin que `clienteAuth.js` sepa
 * nada de React.
 */
const listeners = new Set();

/**
 * Se suscribe a todo cambio de sesión (login, logout, sesión vencida).
 * @param {() => void} cb
 * @returns {() => void} función para desuscribirse.
 */
export function alCambiarSesion(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Avisa a todos los suscriptos que la sesión cambió. */
export function notificarCambioSesion() {
  listeners.forEach((cb) => cb());
}
