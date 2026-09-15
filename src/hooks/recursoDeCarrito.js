import { useEffect, useState } from "react";

function idsDeClave(clave) {
  return clave === "" ? [] : clave.split(",").map(Number);
}

/**
 * Cache STALE-WHILE-REVALIDATE a nivel de módulo para las líneas del carrito.
 * Extraído de `useProductosCarrito` para que productos y combos compartan las
 * MISMAS reglas (ver el JSDoc de `useProductosCarrito.js`, que las explica):
 *
 * - al montar muestra lo último cargado para esos ids y SIEMPRE refetchea;
 * - `cargando` solo sin nada cacheado que sirva para esos ids;
 * - ids contenidos en el cache → cache filtrado; un id nuevo → `cargando`;
 * - si el fetch falla gana el error aunque haya cache;
 * - `revalidando` mientras lo visible sale del cache y el fetch vivo no contestó;
 * - una respuesta vieja no pisa el cache de una más nueva.
 *
 * Cada llamada a `crearRecursoDeCarrito` tiene su propio cache.
 *
 * @param {(ids: number[]) => Promise<Array<{id: number}>>} pedirPorIds
 */
export function crearRecursoDeCarrito(pedirPorIds) {
  let cache = null; // { clave, ids: Set<number>, datos }
  let ultimoPedido = 0;
  let pedidoDelCache = 0;

  function desdeCache(clave) {
    if (!cache) return null;
    if (cache.clave === clave) return cache.datos;
    const ids = idsDeClave(clave);
    if (!ids.every((id) => cache.ids.has(id))) return null;
    const vigentes = new Set(ids);
    return cache.datos.filter((dato) => vigentes.has(dato.id));
  }

  function useRecurso(claveIds) {
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
      let activo = true;
      const pedido = ++ultimoPedido;
      const ids = idsDeClave(claveIds);

      pedirPorIds(ids)
        .then((datos) => {
          // Escribe el cache solo si es más nuevo que el que lo escribió: una
          // respuesta vieja que llega tarde no pisa datos más nuevos, pero una
          // vieja EXITOSA sí queda si la más nueva falló (el error igual gana en
          // pantalla, vía `resultado`).
          if (pedido > pedidoDelCache) {
            pedidoDelCache = pedido;
            cache = { clave: claveIds, ids: new Set(ids), datos };
          }
          if (activo) setResultado({ clave: claveIds, datos, error: false });
        })
        .catch(() => {
          if (activo) setResultado({ clave: claveIds, datos: [], error: true });
        });

      return () => {
        activo = false;
      };
    }, [claveIds]);

    if (resultado && resultado.clave === claveIds) {
      return { datos: resultado.datos, cargando: false, error: resultado.error, revalidando: false };
    }
    const cacheados = desdeCache(claveIds);
    if (cacheados) return { datos: cacheados, cargando: false, error: false, revalidando: true };
    return { datos: [], cargando: true, error: false, revalidando: false };
  }

  /** Vuelve el cache a cero (helper de tests). Los contadores NO vuelven a 0:
   * un pedido pendiente de un test anterior podría sembrar el cache. */
  function reiniciar() {
    cache = null;
  }

  return { useRecurso, reiniciar };
}
