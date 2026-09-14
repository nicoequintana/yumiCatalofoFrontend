import { useCallback, useEffect, useState } from "react";
import { getPedidoPorId, getPedidos } from "../api/cuenta.js";

/**
 * "Mis pedidos" de la cuenta en sesión (listado y detalle), con el mismo patrón
 * STALE-WHILE-REVALIDATE que `useProductosCarrito.js`: cache a nivel de
 * módulo, se muestra lo último cargado al montar y SIEMPRE se refetchea en
 * segundo plano. Sin esto, cada remontaje de `/cuenta/pedidos` o de
 * `/cuenta/pedidos/:id` pintaba el `main` en blanco (`cargando`) durante el
 * viaje de red, el mismo ghosting medido y resuelto en el carrito/checkout el
 * 14/09/2026 (ver `docs/reglas/ordenes-y-stock.md`).
 *
 * - `cargando` es `true` solo cuando no hay nada conocido todavía.
 * - Si el fetch falla gana el error aunque haya cache: "falló la carga"
 *   nunca es lo mismo que "no hay nada".
 * - El cache es de la CUENTA EN SESIÓN, no del navegador: `invalidarPerfil()`
 *   (login, logout, o una sesión que venció) llama a `reiniciarPedidosCliente`
 *   para que la próxima cuenta que entre en este navegador no vea pedidos
 *   ajenos. `generacion` descarta, además, la respuesta de un fetch que salió
 *   ANTES del reinicio y llega después.
 * - `precargarPedidosCliente()` lo llama `MiCuenta.jsx` al montar: sin eso el
 *   PRIMER "Mis pedidos" de la sesión no tenía cache y arrancaba en blanco
 *   (medido: ~270 ms de `main` vacío con 250 ms de red).
 */
let cache = null; // { data }
let ultimaSolicitud = 0;
let solicitudDelCache = 0;
let generacion = 0;
/** Detalle completo por id (string), sembrado por `usePedidoCliente`. */
const detalles = new Map();

/** `getPedidos` que, si responde para la sesión vigente, escribe el cache. */
function pedirListado() {
  const generacionPropia = generacion;
  const solicitud = ++ultimaSolicitud;
  return Promise.resolve(getPedidos()).then((body) => {
    const data = body?.data ?? [];
    // Mismo criterio que `useProductosCarrito`: solo una respuesta más nueva
    // que la que escribió el cache lo pisa.
    if (generacionPropia === generacion && solicitud > solicitudDelCache) {
      solicitudDelCache = solicitud;
      cache = { data };
    }
    return data;
  });
}

export default function usePedidosCliente() {
  const [resultado, setResultado] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    pedirListado()
      .then((data) => {
        if (activo) setResultado({ data, error: false });
      })
      .catch(() => {
        if (activo) setResultado({ data: null, error: true });
      });

    return () => {
      activo = false;
    };
  }, [intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  if (resultado) {
    return { pedidos: resultado.data, cargando: false, error: resultado.error, recargar };
  }
  if (cache) return { pedidos: cache.data, cargando: false, error: false, recargar };
  return { pedidos: null, cargando: true, error: false, recargar };
}

/** Fire-and-forget: siembra el cache del listado. Nunca rechaza. */
export function precargarPedidosCliente() {
  return pedirListado().then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Detalle de un pedido propio, con el mismo stale-while-revalidate que el
 * listado. Lo primero que se muestra, en este orden:
 * 1. el detalle completo, si ya se vio en esta sesión;
 * 2. si no, el RESUMEN que trajo el listado (sin `items`): la cabecera y el
 *    total se pintan ya y los items llegan con el refetch — nunca un `main`
 *    en blanco al abrir un pedido desde "Mis pedidos";
 * 3. si no hay nada, `cargando`.
 *
 * Un 404 (`noEncontrado`) y un error de red ganan sobre lo cacheado, y cada
 * uno se distingue del otro: "no existe" no es "falló la carga".
 *
 * @param {string} id el `:id` de la ruta.
 * @returns {{pedido: object|null, cargando: boolean, error: boolean, noEncontrado: boolean, recargar: () => void}}
 */
export function usePedidoCliente(id) {
  const [resultado, setResultado] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    const generacionPropia = generacion;

    Promise.resolve(getPedidoPorId(id))
      .then((pedido) => {
        if (generacionPropia === generacion) detalles.set(String(id), pedido);
        if (activo) setResultado({ id, pedido, error: false, noEncontrado: false });
      })
      .catch((err) => {
        if (!activo) return;
        const noEncontrado = err?.status === 404;
        setResultado({ id, pedido: null, error: !noEncontrado, noEncontrado });
      });

    return () => {
      activo = false;
    };
  }, [id, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  if (resultado && resultado.id === id) {
    return { pedido: resultado.pedido, cargando: false, error: resultado.error, noEncontrado: resultado.noEncontrado, recargar };
  }
  const conocido = detalles.get(String(id)) ?? cache?.data.find((p) => String(p.id) === String(id)) ?? null;
  if (conocido) return { pedido: conocido, cargando: false, error: false, noEncontrado: false, recargar };
  return { pedido: null, cargando: true, error: false, noEncontrado: false, recargar };
}

/** Vuelve el módulo a cero. Lo llama `invalidarPerfil()` ante un cambio de sesión. */
export function reiniciarPedidosCliente() {
  generacion += 1;
  cache = null;
  detalles.clear();
}
