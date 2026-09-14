import { useCallback, useEffect, useState } from "react";
import { getPedidos } from "../api/cuenta.js";

/**
 * "Mis pedidos" de la cuenta en sesión, con el mismo patrón
 * STALE-WHILE-REVALIDATE que `useProductosCarrito.js`: cache a nivel de
 * módulo, se muestra lo último cargado al montar y SIEMPRE se refetchea en
 * segundo plano. Sin esto, volver a `/cuenta/pedidos` (por ejemplo, desde
 * `/cuenta`) remontaba en blanco (`cargando`) durante el viaje de red, el
 * mismo ghosting medido y resuelto en el carrito/checkout el 14/09/2026
 * (ver `docs/reglas/ordenes-y-stock.md`).
 *
 * - `cargando` es `true` solo cuando no hay nada cacheado todavía.
 * - Si el fetch falla gana el error aunque haya cache: "falló la carga"
 *   nunca es lo mismo que "no hay nada".
 * - El cache es de la CUENTA EN SESIÓN, no del navegador: `invalidarPerfil()`
 *   (login, logout, o una sesión que venció) llama a `reiniciarPedidosCliente`
 *   para que la próxima cuenta que entre en este navegador no vea pedidos
 *   ajenos.
 * - `recargar()` fuerza un fetch nuevo sin esperar un remontaje — lo usa el
 *   botón "Reintentar" de `MisPedidos.jsx`.
 *
 * @returns {{pedidos: object[]|null, cargando: boolean, error: boolean, recargar: () => void}}
 */
let cache = null; // { data }
let ultimaSolicitud = 0;
let solicitudDelCache = 0;

export default function usePedidosCliente() {
  const [resultado, setResultado] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    const solicitud = ++ultimaSolicitud;

    getPedidos()
      .then((body) => {
        const data = body?.data ?? [];
        // Mismo criterio que `useProductosCarrito`: solo una respuesta más
        // nueva que la que escribió el cache lo pisa.
        if (solicitud > solicitudDelCache) {
          solicitudDelCache = solicitud;
          cache = { data };
        }
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

/** Vuelve el módulo a cero. Lo llama `invalidarPerfil()` ante un cambio de sesión. */
export function reiniciarPedidosCliente() {
  cache = null;
}
